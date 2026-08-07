<?php

namespace App\Models;

use App\Enums\ExpenseGroup;
use Database\Factories\PayoutLineFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'group',
    'name',
    'planned',
    'actual',
    'position',
])]
class PayoutLine extends Model
{
    /** @use HasFactory<PayoutLineFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'group' => ExpenseGroup::class,
            'planned' => 'integer',
            'actual' => 'integer',
            'position' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Payout, $this>
     */
    public function payout(): BelongsTo
    {
        return $this->belongsTo(Payout::class);
    }

    /**
     * Where this line came from, when it came from the plan at all.
     *
     * Never read for a figure — the columns on this row are the record. Null
     * once the payable is deleted, and null from the start for spending the
     * plan never saw coming.
     *
     * @return BelongsTo<ExpenseItem, $this>
     */
    public function expenseItem(): BelongsTo
    {
        return $this->belongsTo(ExpenseItem::class);
    }

    /**
     * @param  Builder<PayoutLine>  $query
     */
    #[Scope]
    protected function inGroup(Builder $query, ExpenseGroup $group): void
    {
        $query->where('group', $group);
    }

    /** Spending the plan never forecast. */
    public function isUnplanned(): bool
    {
        return $this->expense_item_id === null && $this->planned === 0;
    }

    /** Positive means more went out than the plan said it would. */
    public function variance(): int
    {
        return $this->actual - $this->planned;
    }
}
