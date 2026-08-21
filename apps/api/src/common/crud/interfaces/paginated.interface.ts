export interface Paginated<T> {
  data: T[];
  nextCursor: string | null;
}
