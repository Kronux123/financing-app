<?php

namespace App\Http\Resources;

use App\Models\BudgetPlan;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The plan as a file you can keep, and bring back on another install.
 *
 * The plan inside is BudgetPlanResource unchanged, so the file can never drift
 * from what the pages read and the Save button sends — a second shape for the
 * same document would be one more contract to keep in step. Around it sits just
 * enough to recognise the file again: which app wrote it and in what version of
 * this format. BudgetPlanImportRequest is the other half.
 *
 * Row ids travel inside the plan, since the pages need them, but mean nothing to
 * another database. The import drops them.
 *
 * @mixin BudgetPlan
 */
class BudgetPlanFileResource extends JsonResource
{
    public const APP = 'kept';

    /** Raised only when an old file could no longer be read as it stands. */
    public const VERSION = 1;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'app' => self::APP,
            'version' => self::VERSION,
            'exportedAt' => now()->toIso8601String(),
            'plan' => (new BudgetPlanResource($this->resource))->resolve($request),
        ];
    }
}
