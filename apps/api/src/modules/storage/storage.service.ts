import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface ObjectMetadata {
  /** null означає «сховище не сказало», а не «нуль байтів». */
  size: number | null;
  mimeType: string | null;
}

export interface SignedUpload {
  url: string;
  token: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    // Supabase перейшов з ключів anon/service_role на publishable/secret.
    // Читаємо новий, зі зворотною сумісністю до старого імені.
    const secret =
      config.get<string>('SUPABASE_SECRET_KEY') ||
      config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!secret) {
      throw new Error('Потрібен SUPABASE_SECRET_KEY (або SUPABASE_SERVICE_ROLE_KEY)');
    }

    this.client = createClient(config.getOrThrow<string>('SUPABASE_URL'), secret, {
      auth: { persistSession: false },
    });
    this.bucket = config.getOrThrow<string>('SUPABASE_BUCKET');
  }

  /**
   * URL, за яким браузер робить PUT напряму в сховище, минаючи наш сервер.
   * Саме тому API не тримає байтів у памʼяті й не впирається в ліміт тіла
   * запиту на безкоштовному Render.
   */
  async createSignedUploadUrl(key: string): Promise<SignedUpload> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUploadUrl(key);

    if (error || !data) {
      this.logger.error(`createSignedUploadUrl(${key}): ${error?.message}`);
      throw new InternalServerErrorException('Не вдалося підготувати завантаження');
    }

    return { url: data.signedUrl, token: data.token };
  }

  async createSignedDownloadUrl(key: string, ttlSeconds = 60): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(key, ttlSeconds);

    if (error || !data) {
      this.logger.error(`createSignedUrl(${key}): ${error?.message}`);
      throw new InternalServerErrorException('Не вдалося підготувати перегляд');
    }

    return data.signedUrl;
  }

  /**
   * Розмір і тип беремо зі сховища, а не з того, що сказав клієнт: при прямому
   * аплоаді сервер байтів не бачить, тому єдине джерело правди — сам обʼєкт.
   */
  async getMetadata(key: string): Promise<ObjectMetadata | null> {
    const slash = key.lastIndexOf('/');
    const folder = slash === -1 ? '' : key.slice(0, slash);
    const filename = slash === -1 ? key : key.slice(slash + 1);

    const { data, error } = await this.client.storage
      .from(this.bucket)
      .list(folder, { search: filename, limit: 1 });

    if (error) {
      this.logger.error(`list(${folder}): ${error.message}`);
      return null;
    }

    const found = data?.find((entry) => entry.name === filename);
    if (!found) return null;

    const meta = found.metadata as { size?: number; mimetype?: string } | null;

    return {
      size: meta?.size ?? null,
      mimeType: meta?.mimetype ?? null,
    };
  }

  /**
   * Перші `bytes` байтів обʼєкта — рівно стільки, скільки треба, щоб
   * перевірити сигнатуру файлу. Range замість download(): завантажувати
   * 50 МБ заради пʼяти байтів не варто.
   */
  async readHead(key: string, bytes: number): Promise<string | null> {
    try {
      const url = await this.createSignedDownloadUrl(key, 30);
      const response = await fetch(url, { headers: { Range: `bytes=0-${bytes - 1}` } });

      if (!response.ok) return null;

      return Buffer.from(await response.arrayBuffer()).toString('latin1');
    } catch (error) {
      this.logger.error(`readHead(${key}): ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Кидає при відмові, а не ковтає її: обидва виклики видаляють блоби перед
   * рядками в БД, і кожен має сам вирішити, чи можна після невдачі стирати
   * ключі. Мовчазна помилка тут означала б назавжди загублені обʼєкти.
   */
  async remove(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    const { error } = await this.client.storage.from(this.bucket).remove(keys);

    if (error) {
      this.logger.error(`remove(${keys.length} обʼєктів): ${error.message}`);
      throw new InternalServerErrorException('Не вдалося прибрати файли зі сховища');
    }
  }
}
