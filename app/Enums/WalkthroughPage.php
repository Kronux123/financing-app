<?php

namespace App\Enums;

/**
 * The pages that have a walkthrough. The steps themselves live with the page in
 * resources/js/lib/walkthroughs.ts, because they point at its elements.
 *
 * Stored as a plain string column rather than a database enum, so a new page is
 * a new case here and not a migration.
 */
enum WalkthroughPage: string
{
    case Dashboard = 'dashboard';
    case Finance = 'finance';
    case Payouts = 'payouts';
    case Debt = 'debt';
    case Months = 'months';
    case Activities = 'activities';

    /**
     * Raise this when a page's walkthrough changes enough to show it again.
     * Everyone who finished or skipped an older version sees the new one once.
     */
    public function version(): int
    {
        return match ($this) {
            self::Dashboard,
            self::Finance,
            self::Payouts,
            self::Debt,
            self::Months,
            self::Activities => 1,
        };
    }
}
