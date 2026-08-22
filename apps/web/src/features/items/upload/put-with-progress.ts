/**
 * fetch не вміє повідомляти прогрес відправки, тому тут XMLHttpRequest —
 * єдиний спосіб показати чесні відсотки, а не фейкову анімацію, що повзе
 * за таймером незалежно від реального стану.
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
        : reject(new Error(`Сховище відповіло ${xhr.status}`));

    xhr.onerror = () => reject(new Error('Немає звʼязку зі сховищем'));
    xhr.onabort = () => reject(new DOMException('Скасовано', 'AbortError'));

    signal.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}
