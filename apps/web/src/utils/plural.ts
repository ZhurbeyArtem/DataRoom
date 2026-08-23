/**
 * English needs one rule, not the three Ukrainian forms this used to carry:
 * everything but 1 takes the plural. Kept as a helper anyway so counted
 * labels read the same way everywhere.
 */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

export const folders = (count: number) => plural(count, 'folder');
export const files = (count: number) => plural(count, 'file');
