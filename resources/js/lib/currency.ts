/**
 * Peso formatting shared across the finance, dashboard, and months pages. These
 * three had drifted into four near-identical local copies.
 */
export function formatPeso(value: number): string {
    return `₱${Math.abs(value).toLocaleString('en-US', {
        maximumFractionDigits: 0,
    })}`;
}

/**
 * To the centavo, for figures read against a payslip — a deduction rounded to
 * the peso no longer matches the line it is meant to be checked against.
 */
export function formatPesoExact(value: number): string {
    return `₱${Math.abs(value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

/** Prefixes an explicit sign, for figures where direction is the point. */
export function formatSigned(value: number): string {
    return `${value < 0 ? '-' : '+'}${formatPeso(value)}`;
}

/**
 * Reads a number out of whatever the user typed. Returns 0 rather than NaN so a
 * half-finished entry never propagates through the budget totals.
 */
export function parsePeso(value: string): number {
    const parsed = Number(value.replace(/[^0-9.]/g, ''));

    return Number.isFinite(parsed) ? parsed : 0;
}
