<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Database\Factories\PaycheckFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'key',
    'label',
    'day_of_month',
    'amount',
    'saves_remainder',
    'position',
])]
class Paycheck extends Model
{
    /** @use HasFactory<PaycheckFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'day_of_month' => 'integer',
            'amount' => 'integer',
            'saves_remainder' => 'boolean',
            'position' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<BudgetPlan, $this>
     */
    public function budgetPlan(): BelongsTo
    {
        return $this->belongsTo(BudgetPlan::class);
    }

    /**
     * @return HasMany<ExpenseItem, $this>
     */
    public function expenseItems(): HasMany
    {
        return $this->hasMany(ExpenseItem::class)->orderBy('position');
    }

    /** Whether this is paid on the last day, whatever that day turns out to be. */
    public function paysOnLastDay(): bool
    {
        return $this->day_of_month === null;
    }

    /**
     * The date this paycheck lands in the given month.
     *
     * A day past the end of a short month is pulled back to the last one, so a
     * paycheck set to the 31st still pays in February.
     */
    public function payday(CarbonInterface $month): CarbonInterface
    {
        $endOfMonth = $month->copy()->endOfMonth();

        if ($this->paysOnLastDay()) {
            return $endOfMonth;
        }

        return $month->copy()->setDay(
            min($this->day_of_month, $endOfMonth->day)
        );
    }

    /** What this paycheck has already committed. */
    public function allocated(): int
    {
        return $this->expenseItems->sum('amount');
    }
}
