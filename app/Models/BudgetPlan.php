<?php

namespace App\Models;

use App\Enums\ExpenseGroup;
use App\Enums\PayCadence;
use Database\Factories\BudgetPlanFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'cadence',
    'monthly_gross',
    'months_of_cover',
    'emergency_fund_balance',
    'savings_pot_balance',
])]
class BudgetPlan extends Model
{
    /** @use HasFactory<BudgetPlanFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cadence' => PayCadence::class,
            'monthly_gross' => 'integer',
            'months_of_cover' => 'integer',
            'emergency_fund_balance' => 'integer',
            'savings_pot_balance' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<Paycheck, $this>
     */
    public function paychecks(): HasMany
    {
        return $this->hasMany(Paycheck::class)->orderBy('position');
    }

    /**
     * @return HasMany<ExpenseItem, $this>
     */
    public function expenseItems(): HasMany
    {
        return $this->hasMany(ExpenseItem::class)->orderBy('position');
    }

    /**
     * What a month costs, before anything is put by.
     *
     * Savings are left out: money you are setting aside is not a cost you would
     * still have to cover if the income stopped, which is the question the
     * emergency fund target is asking.
     */
    public function essentialsPerMonth(): int
    {
        return $this->expenseItems
            ->whereIn('group', ExpenseGroup::essentials())
            ->sum('amount');
    }

    /** What the emergency fund is aiming at. */
    public function emergencyTarget(): int
    {
        return $this->essentialsPerMonth() * $this->months_of_cover;
    }

    /** Everything put by, wherever it sits. */
    public function totalSaved(): int
    {
        return $this->emergency_fund_balance + $this->savings_pot_balance;
    }

    /** Whether the paychecks are worked out from a gross rather than typed in. */
    public function isPaidFromGross(): bool
    {
        return $this->monthly_gross !== null;
    }

    public function monthlyIncome(): int
    {
        return $this->paychecks->sum('amount');
    }
}
