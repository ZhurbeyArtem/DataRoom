import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />

      <Input
        type="search"
        placeholder="Search this room"
        aria-label="Search by file name"
        className="pr-8 pl-8"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />

      {value && (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => onChange('')}
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
