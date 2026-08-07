<?php

namespace App\Models;

use App\Enums\PayoutStatus;
use Database\Factories\PayoutFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'paycheck_key',
    'paycheck_label',
    'paid_on',
    'status',
    'finalized_at',
])]
class Payout extends Model
{
    /** @use HasFactory<PayoutFactory> */
    use HasFactory, SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'paid_on' => 'date',
            'status' => PayoutStatus::class,
            'finalized_at' => 'datetime',
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
     * @return HasMany<PayoutIncome, $this>
     */
    public function incomes(): HasMany
    {
        return $this->hasMany(PayoutIncome::class)->orderBy('position');
    }

    /**
     * @return HasMany<PayoutLine, $this>
     */
    public function lines(): HasMany
    {
        return $this->hasMany(PayoutLine::class)->orderBy('position');
    }

    /**
     * @param  Builder<Payout>  $query
     */
    #[Scope]
    protected function finalized(Builder $query): void
    {
        $query->where('status', PayoutStatus::Finalized);
    }

    /**
     * @param  Builder<Payout>  $query
     */
    #[Scope]
    protected function pending(Builder $query): void
    {
        $query->where('status', PayoutStatus::Pending);
    }

    public function isFinalized(): bool
    {
        return $this->status === PayoutStatus::Finalized;
    }

    public function plannedIncome(): int
    {
        return $this->incomes->sum('planned');
    }

    public function actualIncome(): int
    {
        return $this->incomes->sum('actual');
    }

    public function actualSpend(): int
    {
        return $this->lines->sum('actual');
    }

    /** What was left once the money had actually gone out. */
    public function leftOver(): int
    {
        return $this->actualIncome() - $this->actualSpend();
    }
}
