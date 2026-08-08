<?php

namespace App\Concerns;

/**
 * The peso/centavo boundary.
 *
 * Money is centavos in the database and pesos on the wire: centavos are what
 * arithmetic can be trusted in, pesos are what somebody types. The crossing
 * belongs to resources on the way out and form requests on the way in, and
 * nowhere else — a missing one is a hundredfold error in somebody's budget.
 */
trait ConvertsMoney
{
    /**
     * Whole pesos come back as integers, so an amount the page never edited is
     * the same value it sent.
     */
    protected function toPesos(int $centavos): float|int
    {
        $pesos = $centavos / 100;

        return $pesos === floor($pesos) ? (int) $pesos : $pesos;
    }

    /**
     * Rounded, because 0.07 * 100 is 7.000000000000001 in the language this
     * figure was typed in.
     */
    protected function toCentavos(float|int|string $pesos): int
    {
        return (int) round((float) $pesos * 100);
    }
}
