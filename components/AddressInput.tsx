'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { Place } from '@/types/booking';
import type { AddressSuggestion } from '@/lib/google';

/** True when the place is in Australia but outside Victoria */
export const isOutsideVic = (place: Place | null | undefined) => !!place?.state && place.state !== 'VIC';

// Google bills autocomplete per "session": all keystrokes + the final pick share one token
function newSessionToken() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Address field with Google Places suggestions, fetched through /api/places
 * so the page doesn't load the Google Maps JS SDK.
 */
export default function AddressInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: Place | null;
  onChange: (place: Place | null) => void;
  placeholder?: string;
}) {
  const id = useId();
  const [text, setText] = useState(value?.address ?? '');
  const [typing, setTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const session = useRef('');

  // Show a restored draft's address
  useEffect(() => {
    if (value) setText(value.address);
  }, [value?.placeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch suggestions while typing, debounced so slow connections aren't flooded
  useEffect(() => {
    const q = text.trim();
    if (!typing || q.length < 3) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (!session.current) session.current = newSessionToken();
      setStatus('loading');
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}&session=${session.current}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error();
        const data: { suggestions: AddressSuggestion[] } = await res.json();
        setSuggestions(data.suggestions);
        setStatus('idle');
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setStatus('error');
        }
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, typing]);

  async function select(s: AddressSuggestion) {
    setText(s.text);
    setTyping(false);
    setSuggestions([]);
    setStatus('loading');
    try {
      const res = await fetch(`/api/places?id=${encodeURIComponent(s.placeId)}&session=${session.current}`);
      if (!res.ok) throw new Error();
      const loc: { lat: number; lng: number; state?: string } = await res.json();
      onChange({ placeId: s.placeId, address: s.text, ...loc });
      setStatus('idle');
    } catch {
      setStatus('error');
    } finally {
      session.current = '';
    }
  }

  const listId = `${id}-list`;
  const showList = typing && suggestions.length > 0;

  return (
    <div className="relative">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          enterKeyHint="search"
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setTyping(true);
            if (value) onChange(null);
          }}
          onBlur={() => setTyping(false)}
          className="field-input pr-11"
        />
        {value && (
          <span
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-green-700"
            aria-label="Address selected"
          >
            ✓
          </span>
        )}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          // Keep focus in the input so blur doesn't close the list before the tap lands
          onMouseDown={(e) => e.preventDefault()}
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-navy-200 bg-white shadow-lg"
        >
          {suggestions.map((s) => (
            <li key={s.placeId} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => select(s)}
                className="block min-h-[48px] w-full px-3 py-2 text-left hover:bg-navy-50 focus:bg-navy-50 focus:outline-none"
              >
                <span className="block font-medium text-navy-950">{s.main}</span>
                {s.secondary && <span className="block text-sm text-navy-600">{s.secondary}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {status === 'loading' && <p className="mt-1 text-sm text-navy-600">Searching…</p>}
      {status === 'error' && (
        <p className="field-error" role="alert">
          Couldn’t search addresses. Check your connection and try again.
        </p>
      )}
    </div>
  );
}
