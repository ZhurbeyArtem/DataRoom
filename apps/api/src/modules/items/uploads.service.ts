import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Item, ItemStatus, ItemType } from '../../common/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { buildChildPath } from './helpers/build-item-path.helper';
import { resolveNameConflict } from './helpers/resolve-name-conflict.helper';
import { toItemDto } from './helpers/to-item-dto.helper';
import type { ItemDto } from './interfaces/item.interface';
import type { UploadTicket } from './interfaces/upload.interface';
import { MAX_FILE_BYTES, PDF_MIME, PDF_SIGNATURE } from './upload.constants';

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Step 1 of 3. The row is created immediately but with status PENDING:
   * it reserves the name inside the folder (partial unique index) while
   * staying out of the listing until the upload is confirmed.
   */
  async createUploadUrl(
    parent: Item,
    dto: CreateUploadUrlDto,
    createdById: string,
  ): Promise<UploadTicket> {
    if (dto.mimeType !== PDF_MIME) {
      throw new BadRequestException('Only PDF files are supported');
    }

    if (parent.type !== ItemType.FOLDER) {
      throw new BadRequestException('Files can only be uploaded into a folder');
    }

    const name = await resolveNameConflict(this.prisma, parent.id, dto.fileName);
    const { path, depth } = buildChildPath(parent);

    // The storage key is a random UUID rather than the file name: names
    // change on rename and may contain arbitrary characters, while the key
    // has to stay stable and safe.
    const storageKey = `${parent.dataRoomId}/${randomUUID()}`;

    const item = await this.prisma.item.create({
      data: {
        dataRoomId: parent.dataRoomId,
        parentId: parent.id,
        path,
        depth,
        type: ItemType.FILE,
        name,
        storageKey,
        mimeType: dto.mimeType,
        size: BigInt(dto.size),
        status: ItemStatus.PENDING,
        createdById,
      },
    });

    const signed = await this.storage.createSignedUploadUrl(storageKey);

    return { itemId: item.id, storageKey, uploadUrl: signed.url };
  }

  /**
   * Step 3 of 3. The only place where the "PDFs only" invariant is actually
   * enforced: at step 1 all we know is what the client claimed, and the
   * bytes travel to storage bypassing our server.
   */
  async confirmUpload(item: Item): Promise<ItemDto> {
    if (!item.storageKey) {
      throw new BadRequestException('This is not a file');
    }

    if (item.status === ItemStatus.READY) return toItemDto(item);

    const metadata = await this.storage.getMetadata(item.storageKey);
    if (!metadata) {
      throw new BadRequestException('File not found in storage');
    }

    if (metadata.size !== null && metadata.size > MAX_FILE_BYTES) {
      await this.discard(item, item.storageKey);
      throw new BadRequestException('File is too large: 50 MB maximum');
    }

    // The object's stored type proves nothing: Supabase takes it from the
    // Content-Type header set by that same client. Look at the file itself.
    const head = await this.storage.readHead(item.storageKey, PDF_SIGNATURE.length);

    if (head !== PDF_SIGNATURE) {
      await this.discard(item, item.storageKey);
      throw new BadRequestException('Only PDF files are supported');
    }

    const confirmed = await this.prisma.item.update({
      where: { id: item.id },
      data: {
        status: ItemStatus.READY,
        // Storage says nothing about the size — keep the one declared in
        // the ticket. It is validated (1…50 MB) and always closer to the
        // truth than zero.
        size: metadata.size === null ? item.size : BigInt(metadata.size),
        mimeType: PDF_MIME,
      },
    });

    return toItemDto(confirmed);
  }

  /**
   * A rejected upload is cleaned up straight away — both the object and the
   * row. Waiting for the hourly sweep is not worth it: until then the name
   * would stay taken and the next attempt at the same file would come back
   * suffixed "(1)".
   */
  private async discard(item: Item, storageKey: string): Promise<void> {
    try {
      await this.storage.remove([storageKey]);
    } catch {
      // Do not turn the rejection into a "server error": what matters to
      // the user is that the file is the wrong kind. The leftover object
      // will be picked up by CleanupService within the hour — which is
      // exactly why the row is left in place here.
      return;
    }

    await this.prisma.item.delete({ where: { id: item.id } });
  }

  /** 60-second TTL: the link should live exactly as long as opening it takes. */
  async createDownloadUrl(item: Item): Promise<{ url: string }> {
    if (item.type !== ItemType.FILE || !item.storageKey) {
      throw new BadRequestException('This is not a file');
    }

    if (item.status !== ItemStatus.READY) {
      throw new BadRequestException('The file has not been uploaded yet');
    }

    return { url: await this.storage.createSignedDownloadUrl(item.storageKey, 60) };
  }
}
