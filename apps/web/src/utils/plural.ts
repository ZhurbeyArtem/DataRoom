/**
 * Українська має три форми множини, і «буде видалено 3 файлів» замість
 * «3 файли» одразу читається як недбалість.
 */
export function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} ${many}`;

  const mod10 = count % 10;
  if (mod10 === 1) return `${count} ${one}`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} ${few}`;

  return `${count} ${many}`;
}

export const folders = (count: number) => plural(count, 'папку', 'папки', 'папок');
export const files = (count: number) => plural(count, 'файл', 'файли', 'файлів');
