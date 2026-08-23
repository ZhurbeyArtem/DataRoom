import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface ObjectMetadata {
  /** null means "storage did not say", not "zero bytes". */
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
    // Supabase moved from anon/service_role keys to publishable/secret ones.
    // Read the new name, falling back to the old one.
    const secret =
      config.get<string>('SUPABASE_SECRET_KEY') ||
      config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!secret) {
      throw new Error('SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is required');
    }

    this.client = createClient(config.getOrThrow<string>('SUPABASE_URL'), secret, {
      auth: { persistSession: false },
    });
    this.bucket = config.getOrThrow<string>('SUPABASE_BUCKET');
  }

  /**
   * A URL the browser PUTs to directly, bypassing our server. This is why the
   * API never holds file bytes in memory and never hits the request body
   * limit of the free Render tier.
   */
  async createSignedUploadUrl(key: string): Promise<SignedUpload> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUploadUrl(key);

    if (error || !data) {
      this.logger.error(`createSignedUploadUrl(${key}): ${error?.message}`);
      throw new InternalServerErrorException('Could not prepare the upload');
    }

    return { url: data.signedUrl, token: data.token };
  }

  async createSignedDownloadUrl(key: string, ttlSeconds = 60): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(key, ttlSeconds);

    if (error || !data) {
      this.logger.error(`createSignedUrl(${key}): ${error?.message}`);
      throw new InternalServerErrorException('Could not prepare the preview');
    }

    return data.signedUrl;
  }

  /**
   * Size and type come from storage rather than from what the client claimed:
   * with a direct upload the server never sees the bytes, so the object
   * itself is the only source of truth.
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
   * The first `bytes` bytes of the object — exactly as much as is needed to
   * check the file signature. Range instead of download(): pulling 50 MB for
   * the sake of five bytes is not worth it.
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
   * Throws on failure instead of swallowing it: both callers delete blobs
   * before the database rows, and each has to decide for itself whether the
   * keys may be erased after a failure. A silent error here would mean
   * permanently orphaned objects.
   */
  async remove(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    const { error } = await this.client.storage.from(this.bucket).remove(keys);

    if (error) {
      this.logger.error(`remove(${keys.length} objects): ${error.message}`);
      throw new InternalServerErrorException('Could not remove files from storage');
    }
  }
}
