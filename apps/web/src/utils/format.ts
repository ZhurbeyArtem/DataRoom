const UNITS = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes === 0) return '0 Б';

  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** power;

  return `${value.toFixed(power === 0 ? 0 : 1)} ${UNITS[power]}`;
}

const relative = new Intl.RelativeTimeFormat('uk', { numeric: 'auto' });
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 30],
  ['month', 12],
  ['year', Number.POSITIVE_INFINITY],
];

/** «5 хвилин тому» замість дати: у файловому менеджері так читається швидше. */
export function formatRelative(value: string | Date): string {
  let delta = (Date.now() - new Date(value).getTime()) / 1000;
  for (const [unit, size] of STEPS) {
    if (Math.abs(delta) < size) return relative.format(-Math.round(delta), unit);
    delta /= size;
  }
  return new Date(value).toLocaleDateString('uk');
}
