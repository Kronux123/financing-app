<?php

namespace App\Models;

use App\Enums\ExpenseGroup;
use Carbon\CarbonInterface;
use Database\Factories\ExpenseItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'group',
    'name',
    'amount',
    'started_on',
    'ends_on',
    'is_debt',
    'position',
])]
class ExpenseItem extends Model
{
    /** @use HasFactory<ExpenseItemFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'group' => ExpenseGroup::class,
            'amount' => 'integer',
            'started_on' => 'date',
            'ends_on' => 'date',
            'is_debt' => 'boolean',
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
     * @return BelongsTo<Paycheck, $this>
     */
    public function paycheck(): BelongsTo
    {
        return $this->belongsTo(Paycheck::class);
    }

    /**
     * Every recorded payment against this item, across every payday.
     *
     * @return HasMany<PayoutLine, $this>
     */
    public function payoutLines(): HasMany
    {
        return $this->hasMany(PayoutLine::class);
    }

    /**
     * @param  Builder<ExpenseItem>  $query
     */
    #[Scope]
    protected function debts(Builder $query): void
    {
        $query->where('is_debt', true);
    }

    /**
     * Items finishing between now and `$months` ahead — what the budget is
     * about to get back.
     *
     * @param  Builder<ExpenseItem>  $query
     */
    #[Scope]
    protected function endingWithin(Builder $query, int $months, CarbonInterface $from): void
    {
        $query->whereNotNull('ends_on')
            ->whereDate('ends_on', '>=', $from->copy()->startOfMonth())
            ->whereDate('ends_on', '<=', $from->copy()->addMonths($months - 1)->endOfMonth());
    }

    /**
     * Payments left, counting the month it ends in — a payable finishing this
     * month still has this month's payment to make.
     *
     * Null when nothing says when it finishes.
     */
    public function monthsRemaining(CarbonInterface $from): ?int
    {
        if ($this->ends_on === null) {
            return null;
        }

        // Carbon 3 returns a signed float here, so it is squared up before use.
        $whole = (int) $from->copy()->startOfMonth()->diffInMonths(
            $this->ends_on->copy()->startOfMonth()
        );

        return max(0, $whole + 1);
    }

    /**
     * What is still owed on a debt: the payment times the payments left.
     *
     * Interest is not modelled, by decision — this is the arithmetic you would
     * do on paper, exact for a nought per cent installment and optimistic on a
     * card. Null when there is no end date to count to.
     */
    public function outstanding(CarbonInterface $from): ?int
    {
        $months = $this->monthsRemaining($from);

        return $months === null ? null : $this->amount * $months;
    }
}
