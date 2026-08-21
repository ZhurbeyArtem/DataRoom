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

const ALLOWED_MIME = new Set(['application/pdf']);

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Крок 1 із трьох. Рядок створюється одразу, але зі статусом PENDING:
   * він займає імʼя в папці (частковий унікальний індекс), проте не
   * показується в лістингу, поки аплоад не підтверджено.
   */
  async createUploadUrl(
    parent: Item,
    dto: CreateUploadUrlDto,
    createdById: string,
  ): Promise<UploadTicket> {
    if (!ALLOWED_MIME.has(dto.mimeType)) {
      throw new BadRequestException('Підтримуються лише PDF-файли');
    }

    if (parent.type !== ItemType.FOLDER) {
      throw new BadRequestException('Завантажувати можна лише в папку');
    }

    const name = await resolveNameConflict(this.prisma, parent.id, dto.fileName);
    const { path, depth } = buildChildPath(parent);

    // Ключ у сховищі — випадковий UUID, а не імʼя файлу: імена змінюються
    // при перейменуванні й можуть містити будь-які символи, а ключ має бути
    // стабільним і безпечним.
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
   * Крок 3 із трьох. Звіряємо заявлений розмір із реальним обʼєктом
   * у сховищі — і лише тоді робимо файл видимим.
   */
  async confirmUpload(item: Item): Promise<ItemDto> {
    if (!item.storageKey) {
      throw new BadRequestException('Це не файл');
    }

    if (item.status === ItemStatus.READY) return toItemDto(item);

    const metadata = await this.storage.getMetadata(item.storageKey);
    if (!metadata) {
      throw new BadRequestException('Файл не знайдено у сховищі');
    }

    const confirmed = await this.prisma.item.update({
      where: { id: item.id },
      data: {
        status: ItemStatus.READY,
        size: BigInt(metadata.size),
        mimeType: metadata.mimeType ?? item.mimeType,
      },
    });

    return toItemDto(confirmed);
  }

  /** TTL 60 секунд: посилання має жити рівно стільки, скільки триває відкриття. */
  async createDownloadUrl(item: Item): Promise<{ url: string }> {
    if (item.type !== ItemType.FILE || !item.storageKey) {
      throw new BadRequestException('Це не файл');
    }

    if (item.status !== ItemStatus.READY) {
      throw new BadRequestException('Файл ще не завантажено');
    }

    return { url: await this.storage.createSignedDownloadUrl(item.storageKey, 60) };
  }
}
