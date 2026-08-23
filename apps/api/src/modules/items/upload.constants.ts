/** The same limit is set on the bucket itself — storage does not rely on us. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export const PDF_MIME = 'application/pdf';

/**
 * The leading bytes of any PDF. What is actually in storage is decided by
 * these, not by the declared type: the client sets Content-Type, so an
 * object's mimeType merely repeats what that client said about itself.
 */
export const PDF_SIGNATURE = '%PDF-';
