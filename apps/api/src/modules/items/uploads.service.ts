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
   * Крок 1 із трьох. Рядок створюється одразу, але зі статусом PENDING:
   * він займає імʼя в папці (частковий унікальний індекс), проте не
   * показується в лістингу, поки аплоад не підтверджено.
   */
  async createUploadUrl(
    parent: Item,
    dto: CreateUploadUrlDto,
    createdById: string,
  ): Promise<UploadTicket> {
    if (dto.mimeType !== PDF_MIME) {
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
   * Крок 3 із трьох. Єдине місце, де інвариант «у кімнаті лише PDF» реально
   * перевіряється: на кроці 1 ми знаємо тільки те, що заявив клієнт, а байти
   * йдуть у сховище повз наш сервер.
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

    if (metadata.size !== null && metadata.size > MAX_FILE_BYTES) {
      await this.discard(item, item.storageKey);
      throw new BadRequestException('Файл завеликий: максимум 50 МБ');
    }

    // Тип обʼєкта у сховищі не доказ: Supabase бере його з Content-Type,
    // який виставляє той самий клієнт. Дивимось на сам файл.
    const head = await this.storage.readHead(item.storageKey, PDF_SIGNATURE.length);

    if (head !== PDF_SIGNATURE) {
      await this.discard(item, item.storageKey);
      throw new BadRequestException('Підтримуються лише PDF-файли');
    }

    const confirmed = await this.prisma.item.update({
      where: { id: item.id },
      data: {
        status: ItemStatus.READY,
        // Сховище мовчить про розмір — лишаємо заявлений у квитку.
        // Він валідований (1…50 МБ) і завжди ближчий до правди, ніж нуль.
        size: metadata.size === null ? item.size : BigInt(metadata.size),
        mimeType: PDF_MIME,
      },
    });

    return toItemDto(confirmed);
  }

  /**
   * Відхилений аплоад прибирається одразу — і обʼєкт, і рядок. Чекати
   * на годинну чистку не варто: доти імʼя лишалося б зайнятим, а наступна
   * спроба того самого файлу отримала б суфікс «(1)».
   */
  private async discard(item: Item, storageKey: string): Promise<void> {
    try {
      await this.storage.remove([storageKey]);
    } catch {
      // Не міняємо причину відмови на «помилку сервера»: користувачеві
      // важливо почути, що файл не той. Обʼєкт, що лишився, за годину
      // підбере CleanupService — рядок ми зараз саме для цього не видаляємо.
      return;
    }

    await this.prisma.item.delete({ where: { id: item.id } });
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
