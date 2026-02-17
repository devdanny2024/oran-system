'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from './ui/input';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function AddressAutocompleteInput({
  value,
  onChange,
  placeholder,
  className,
}: Props) {
  const [items, setItems] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const input = value.trim();
    const timer = setTimeout(async () => {
      if (input.length < 3) {
        setLoading(false);
        setItems([]);
        setOpen(false);
        setActiveIndex(-1);
        return;
      }

      setLoading(true);
      setOpen(true);
      try {
        const res = await fetch(
          `/api/pricing/address-suggestions?input=${encodeURIComponent(input)}`,
        );
        const body = (await res.json()) as { items?: string[] };
        const list = Array.isArray(body?.items) ? body.items : [];
        setItems(list);
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        setItems([]);
        setOpen(true);
        setActiveIndex(-1);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const canOpen = useMemo(() => open && (loading || items.length > 0), [open, loading, items.length]);

  return (
    <div className="relative" ref={boxRef}>
      <Input
        value={value}
        placeholder={placeholder}
        className={className}
        onFocus={() => {
          if (items.length > 0) setOpen(true);
        }}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (!canOpen || loading || items.length === 0) return;

          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((prev) => (prev + 1) % items.length);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
          } else if (event.key === 'Enter') {
            if (activeIndex >= 0 && activeIndex < items.length) {
              event.preventDefault();
              onChange(items[activeIndex]);
              setOpen(false);
              setActiveIndex(-1);
            }
          } else if (event.key === 'Escape') {
            setOpen(false);
            setActiveIndex(-1);
          }
        }}
      />

      {canOpen && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-background shadow-md">
          {loading ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Loading addresses...</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No matches found.</div>
          ) : (
            items.map((item, index) => (
              <button
                key={`${item}-${index}`}
                type="button"
                className={`w-full px-3 py-2 text-left text-xs hover:bg-muted ${
                  index === activeIndex ? 'bg-muted' : ''
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(item);
                  setOpen(false);
                  setActiveIndex(-1);
                }}
              >
                {item}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
