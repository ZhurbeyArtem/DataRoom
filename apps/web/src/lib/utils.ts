import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Зливає Tailwind-класи так, щоб пізніший клас переміг конфліктний раніший. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
