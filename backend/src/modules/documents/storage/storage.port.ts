/** Abstraction over object storage so documents work with local disk or S3. */
export interface StoragePort {
  /** Returns a URL the client can PUT the file to directly. */
  presignPut(key: string, mimeType: string): Promise<string>;
  /** Returns a short-lived URL to download the object. */
  presignGet(key: string): Promise<string>;
  /** Whether the object actually exists (used on confirm). */
  exists(key: string): Promise<boolean>;
}

export const STORAGE_PORT = Symbol('STORAGE_PORT');
