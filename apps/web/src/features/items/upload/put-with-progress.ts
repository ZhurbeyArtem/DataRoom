/**
 * fetch cannot report upload progress, so XMLHttpRequest is the only way to
 * show honest percentages rather than a fake animation creeping along on a
 * timer regardless of what is actually happening.
 */
export function putWithProgress(
  url: string,
  file: File,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type || 'application/pdf');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };

    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Storage responded with ${xhr.status}`));

    xhr.onerror = () => reject(new Error('No connection to storage'));
    xhr.onabort = () => reject(new DOMException('Cancelled', 'AbortError'));

    signal.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}
