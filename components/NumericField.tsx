'use client';

import { useState, type ComponentProps } from 'react';

type Props = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'onBlur' | 'type'> & {
  value: number | null;
  decimal?: boolean;
  onValue: (value: number | null) => void;
  onCommit?: () => void;
};

export default function NumericField({value, decimal = false, onValue, onCommit, ...props}: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);
  return <input {...props} type="text" inputMode={decimal ? 'decimal' : 'numeric'}
    value={draft ?? (value === null ? '' : String(value).replace('.', ','))}
    onChange={event => {
      const text = event.target.value;
      const valid = decimal ? /^\d*(?:[.,]\d{0,2})?$/.test(text) : /^\d*$/.test(text);
      if (!valid) return;
      setDraft(text);
      setChanged(true);
      const number = Number(text.replace(',', '.'));
      onValue(text === '' || !Number.isFinite(number) ? null : number);
    }}
    onBlur={() => {
      setDraft(null);
      if (changed) onCommit?.();
      setChanged(false);
    }} />;
}
