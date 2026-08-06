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
    'data-test'?: string;
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
        const parsed = parsePeso(next);

        setDraft(next);
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
                onChange={(event) => handleChange(event.target.value)}
                className="pl-7 text-right tabular-nums"
            />
        </div>
    );
}
