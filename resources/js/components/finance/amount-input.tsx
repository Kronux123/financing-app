import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { parsePeso } from '@/lib/currency';
import { cn } from '@/lib/utils';

type AmountInputProps = {
    value: number;
    onValueChange: (value: number) => void;
    id?: string;
    /** Used as the accessible name when there is no visible label. */
    label?: string;
    placeholder?: string;
    className?: string;
    /** Locks the field without hiding the figure — a finalized record reads. */
    disabled?: boolean;
    'data-test'?: string;
};

/**
 * Digits and at most one decimal point. Anything else is dropped as it is
 * typed, so the field can never show a figure the plan will not store — and a
 * pasted `₱1,234` lands as `1234` rather than sitting there looking accepted.
 *
 * A second point folds into the first group of decimals, so `1.2.3` becomes
 * `1.23` instead of throwing away the keystroke.
 */
const toAmountText = (value: string): string => {
    const [whole, ...rest] = value.replace(/[^\d.]/g, '').split('.');

    return rest.length > 0 ? `${whole}.${rest.join('')}` : whole;
};

/**
 * A peso field that keeps what the user is midway through typing.
 *
 * The plan stores amounts as numbers, but `1200.` and `007` are not yet
 * numbers. Holding the raw string here and only publishing the parsed value
 * upward means a trailing decimal point survives long enough to type the cents.
 */
export function AmountInput({
    value,
    onValueChange,
    id,
    label,
    placeholder = '0',
    className,
    disabled,
    'data-test': dataTest,
}: AmountInputProps) {
    const [draft, setDraft] = useState(value ? String(value) : '');
    const [lastValue, setLastValue] = useState(value);

    // Resync when the value is changed from outside, such as a cadence switch.
    if (value !== lastValue) {
        setLastValue(value);
        setDraft(value ? String(value) : '');
    }

    const handleChange = (next: string) => {
        const text = toAmountText(next);
        const parsed = parsePeso(text);

        setDraft(text);
        setLastValue(parsed);
        onValueChange(parsed);
    };

    return (
        <div className={cn('relative', className)}>
            <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
            >
                ₱
            </span>
            <Input
                id={id}
                aria-label={label}
                data-test={dataTest}
                inputMode="decimal"
                placeholder={placeholder}
                value={draft}
                disabled={disabled}
                onChange={(event) => handleChange(event.target.value)}
                className="pl-7 text-right tabular-nums"
            />
        </div>
    );
}
