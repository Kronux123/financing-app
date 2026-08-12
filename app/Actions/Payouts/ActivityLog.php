<?php

namespace App\Actions\Payouts;

use App\Models\Payout;
use App\Models\PayoutIncome;
use App\Models\PayoutLine;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Everything that has moved, newest first, one page at a time.
 *
 * An activity is a `payout_incomes` row or a `payout_lines` row seen from the
 * outside — there is no table of its own behind this. That is what makes paging
 * it awkward: the order runs across two tables, so neither can be limited on its
 * own without cutting the other in the wrong place.
 *
 * So it happens in two steps. A union orders and slices the pair in SQL, which
 * is the only part the database can do better than PHP, and comes back holding
 * nothing but ids. Those rows are then hydrated and read through the same model
 * methods everything else uses. Working the sign, the category and the unplanned
 * flag out in SQL instead would put a second copy of each beyond the reach of
 * the tests that cover the first.
 */
class ActivityLog
{
    /**
     * @param  int<1, max>  $perPage
     * @return LengthAwarePaginator<int, array{key: string, date: string, title: string, category: string, payday: string, amount: int, isUnplanned: bool, status: string}>
     */
    public function handle(User $user, int $perPage): LengthAwarePaginator
    {
        $page = $this->order($user)->paginate($perPage);

        $rows = collect($page->items());

        $incomes = PayoutIncome::with('payout')
            ->findMany($this->idsOf($rows, 'income'))
            ->keyBy('id');

        $lines = PayoutLine::with('payout')
            ->findMany($this->idsOf($rows, 'line'))
            ->keyBy('id');

        return $page->through(fn (object $row): array => $row->kind === 'income'
            ? $this->income($incomes[$row->row_id])
            : $this->line($lines[$row->row_id]));
    }

    /**
     * The two tables in one list, ordered but not yet read.
     *
     * Only what the ordering needs is selected. Both halves of a union have to
     * line up column for column, and a narrow select keeps that easy to see as
     * well as keeping the slice cheap.
     */
    private function order(User $user): QueryBuilder
    {
        $incomes = $this->side($user, 'payout_incomes', 'income', isOut: 0);
        $lines = $this->side($user, 'payout_lines', 'line', isOut: 1);

        return DB::query()
            ->fromSub($incomes->unionAll($lines), 'activities')
            ->orderByDesc('paid_on')
            /** Ties broken the same way the relation breaks them. */
            ->orderByDesc('payout_id')
            /** Money in, then money out, in the order the payday lists it. */
            ->orderBy('is_out')
            ->orderBy('position')
            ->orderBy('row_id');
    }

    private function side(User $user, string $table, string $kind, int $isOut): QueryBuilder
    {
        return DB::table($table)
            ->join('payouts', 'payouts.id', '=', $table.'.payout_id')
            ->where('payouts.user_id', $user->id)
            /** A deleted payday is not history you can still read. */
            ->whereNull('payouts.deleted_at')
            ->select([
                DB::raw("'{$kind}' as kind"),
                $table.'.id as row_id',
                'payouts.id as payout_id',
                'payouts.paid_on as paid_on',
                DB::raw("{$isOut} as is_out"),
                $table.'.position as position',
            ]);
    }

    /**
     * The ids of one kind on this page, so each table is read in a single query
     * holding only the rows about to be shown.
     *
     * @param  Collection<int, object>  $rows
     * @return list<mixed>
     */
    private function idsOf(Collection $rows, string $kind): array
    {
        return $rows->where('kind', $kind)->pluck('row_id')->all();
    }

    /**
     * Money in, so the amount is positive.
     *
     * @return array{key: string, date: string, title: string, category: string, payday: string, amount: int, isUnplanned: bool, status: string}
     */
    private function income(PayoutIncome $income): array
    {
        return [
            /*
             * Prefixed because a line and an income can share an id. Made of
             * characters a CSS selector can hold, so a test can name a row —
             * the same constraint PayoutResource's `key` is built under.
             */
            'key' => 'income-'.$income->id,
            ...$this->payday($income->payout),
            /** "13th month" already names itself, so the label is the title. */
            'title' => $income->label,
            'category' => 'Income',
            'amount' => $income->actual,
            'isUnplanned' => false,
        ];
    }

    /**
     * Money out, so the amount is negative. Savings included: earmarking it
     * still takes it out of what there is left to spend, and the category is
     * what tells the two apart.
     *
     * @return array{key: string, date: string, title: string, category: string, payday: string, amount: int, isUnplanned: bool, status: string}
     */
    private function line(PayoutLine $line): array
    {
        return [
            'key' => 'line-'.$line->id,
            ...$this->payday($line->payout),
            'title' => $line->name,
            /** The group as copied onto the row, never read back off the plan. */
            'category' => $line->group->label(),
            /** `actual` is the record. `planned` is what the plan hoped for. */
            'amount' => -$line->actual,
            'isUnplanned' => $line->isUnplanned(),
        ];
    }

    /**
     * What every row carries from the payday holding it.
     *
     * @return array{date: string, payday: string, status: string}
     */
    private function payday(Payout $payout): array
    {
        return [
            'date' => $payout->paid_on->toDateString(),
            'payday' => $payout->paycheck_label,
            'status' => $payout->status->value,
        ];
    }
}
