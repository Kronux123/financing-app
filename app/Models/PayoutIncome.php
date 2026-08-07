<?php

namespace App\Models;

use App\Enums\IncomeSource;
use Database\Factories\PayoutIncomeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'source',
    'label',
    'planned',
    'actual',
    'position',
])]
class PayoutIncome extends Model
{
    /** @use HasFactory<PayoutIncomeFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'source' => IncomeSource::class,
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

    /** Positive means the payday came in better than the plan expected. */
    public function variance(): int
    {
        return $this->actual - $this->planned;
    }
}
