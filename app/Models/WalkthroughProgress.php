<?php

namespace App\Models;

use App\Enums\WalkthroughPage;
use Database\Factories\WalkthroughProgressFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One user's run through one version of a page's walkthrough, ended either by
 * finishing it or by skipping it.
 */
#[Fillable([
    'page',
    'version',
    'completed_at',
    'dismissed_at',
])]
class WalkthroughProgress extends Model
{
    /** @use HasFactory<WalkthroughProgressFactory> */
    use HasFactory;

    protected $table = 'walkthrough_progress';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'page' => WalkthroughPage::class,
            'version' => 'integer',
            'completed_at' => 'datetime',
            'dismissed_at' => 'datetime',
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
     * Rows for the version each page is on now. An older version's row no
     * longer counts, which is how a reworked walkthrough comes back.
     *
     * @param  Builder<WalkthroughProgress>  $query
     */
    #[Scope]
    protected function current(Builder $query): void
    {
        $query->where(function (Builder $query): void {
            foreach (WalkthroughPage::cases() as $page) {
                $query->orWhere(fn (Builder $query) => $query
                    ->where('page', $page)
                    ->where('version', $page->version()));
            }
        });
    }
}
