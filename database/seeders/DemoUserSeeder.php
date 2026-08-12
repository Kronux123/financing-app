<?php

namespace Database\Seeders;

use App\Actions\Payouts\OpenPayoutsForPlan;
use App\Enums\ExpenseGroup;
use App\Enums\IncomeSource;
use App\Enums\PayCadence;
use App\Enums\PayoutStatus;
use App\Models\BudgetPlan;
use App\Models\ExpenseItem;
use App\Models\Paycheck;
use App\Models\Payout;
use App\Models\PayoutLine;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * One demo account with a year of history behind it: a hydrated plan, and a
 * settled payday for every one that has come round since January.
 *
 * The paydays are opened by `OpenPayoutsForPlan` rather than written here, which
 * is the point. That action is what copies the plan onto a record and stops
 * looking at it, so demo data comes out shaped exactly like data the app made for
 * itself — including the weekend rule that pulls a payday back to the Friday
 * before it. Nothing in here reaches into the ledger to invent a shape the app
 * could not produce.
 *
 * Every figure is centavos, as the columns are. The month-by-month variations are
 * fixed rather than faked so the demo tells the same story on every reseed and a
 * screenshot stays worth comparing to.
 */
class DemoUserSeeder extends Seeder
{
    public const EMAIL = 'test1@mail.com';

    /**
     * ₱25,000 twice a month. The end-of-month paycheck sweeps its remainder,
     * which is the case worth demonstrating: the swept line is worked out in the
     * browser and never stored, so a plan that only earmarks savings understates
     * what was really put by.
     *
     * @var list<array{key: string, label: string, day_of_month: int|null, amount: int, saves_remainder: bool}>
     */
    private const PAYCHECKS = [
        ['key' => 'mid-month', 'label' => '15th', 'day_of_month' => 15, 'amount' => 2_500_000, 'saves_remainder' => false],
        ['key' => 'end-month', 'label' => 'End of month', 'day_of_month' => null, 'amount' => 2_500_000, 'saves_remainder' => true],
    ];

    /**
     * The plan the demo user would have typed into the finance page, by paycheck.
     *
     * The 15th allocates its ₱25,000 to the last centavo. The end of the month
     * commits ₱20,000 and sweeps the other ₱5,000, so ₱9,000 a month is put by
     * between the earmark and the sweep — the goal the calendar shades against.
     *
     * @var array<string, list<array{group: ExpenseGroup, name: string|null, amount: int, debt?: array{months: int, paid: int}}>>
     */
    private const PLAN = [
        'mid-month' => [
            ['group' => ExpenseGroup::Payables, 'name' => 'Rent', 'amount' => 900_000],
            ['group' => ExpenseGroup::Payables, 'name' => 'Electricity', 'amount' => 240_000],
            ['group' => ExpenseGroup::Payables, 'name' => 'Water', 'amount' => 60_000],
            ['group' => ExpenseGroup::Payables, 'name' => 'Internet', 'amount' => 170_000],
            ['group' => ExpenseGroup::Payables, 'name' => 'Transport', 'amount' => 280_000],
            ['group' => ExpenseGroup::Allowance, 'name' => null, 'amount' => 450_000],
            ['group' => ExpenseGroup::Savings, 'name' => null, 'amount' => 400_000],
        ],
        'end-month' => [
            ['group' => ExpenseGroup::Payables, 'name' => 'Groceries', 'amount' => 600_000],
            ['group' => ExpenseGroup::Payables, 'name' => 'Phone plan', 'amount' => 100_000],
            ['group' => ExpenseGroup::Payables, 'name' => 'Health insurance', 'amount' => 150_000],
            /** Halfway through: six paid, six to go, which is what the debt page counts. */
            ['group' => ExpenseGroup::Payables, 'name' => 'Laptop installment', 'amount' => 400_000, 'debt' => ['months' => 6, 'paid' => 6]],
            ['group' => ExpenseGroup::Payables, 'name' => 'Credit card', 'amount' => 300_000, 'debt' => ['months' => 15, 'paid' => 3]],
            ['group' => ExpenseGroup::Allowance, 'name' => null, 'amount' => 450_000],
        ],
    ];

    /**
     * What each month actually did, by month number.
     *
     * Electricity climbs through the hot months and falls back, groceries drift,
     * the allowance goes over twice, and two months carry something nobody
     * forecast. Figures are the actuals; anything absent came in on plan.
     *
     * @var array<int, array{electricity?: int, groceries?: int, internet?: int, allowance?: int, unplanned?: array{name: string, amount: int}, bonus?: int}>
     */
    private const MONTHS = [
        1 => ['electricity' => 220_000, 'groceries' => 640_000],
        /** A month where everything came in under the forecast, so the goal is met. */
        2 => ['electricity' => 210_000, 'groceries' => 580_000],
        3 => ['electricity' => 265_000, 'groceries' => 615_000, 'unplanned' => ['name' => 'Dental work', 'amount' => 350_000]],
        4 => ['electricity' => 320_000, 'groceries' => 660_000],
        5 => ['electricity' => 345_000, 'groceries' => 590_000, 'internet' => 145_000],
        6 => ['electricity' => 360_000, 'groceries' => 620_000, 'bonus' => 1_250_000],
        /** The bad month: the allowance over on both halves and a repair on top. */
        7 => ['electricity' => 330_000, 'groceries' => 705_000, 'allowance' => 520_000, 'unplanned' => ['name' => 'Aircon repair', 'amount' => 420_000]],
        8 => ['electricity' => 290_000, 'groceries' => 610_000],
        9 => ['electricity' => 255_000, 'groceries' => 595_000],
        10 => ['electricity' => 235_000, 'groceries' => 630_000],
        11 => ['electricity' => 225_000, 'groceries' => 650_000],
        12 => ['electricity' => 240_000, 'groceries' => 780_000, 'allowance' => 560_000],
    ];

    public function __construct(private readonly OpenPayoutsForPlan $openPayouts) {}

    public function run(): void
    {
        $this->clearPreviousRun();

        $user = User::factory()->create([
            'name' => 'Demo User',
            'email' => self::EMAIL,
            /** Hashed by the cast on the model, so this is the plain password. */
            'password' => 'password',
        ]);

        $plan = $this->plan($user);

        /*
         * Backdated so the paydays since January count as the plan's own. The
         * action deliberately skips anything older than the plan — the app has
         * nothing to say about a month it was not around for — so a plan created
         * today would open no history at all.
         */
        $plan->forceFill(['created_at' => now()->startOfYear()])->save();

        /** Twelve, so a reseed in January still reaches back through December. */
        $opened = $this->openPayouts->handle($plan->refresh(), now(), 12);

        $settled = $this->settle($user);

        /** Set by whichever of `db:seed`, `$this->call()` or `$this->seed()` ran this. */
        $this->command->info("Demo user {$user->email} seeded: {$opened} payday(s) opened, {$settled} settled.");
    }

    /**
     * Removes an earlier demo user so the seeder can be run again.
     *
     * Every table hangs off the user with a cascading foreign key, so the one
     * delete takes the plan, the paydays and their rows with it. Force-deleted
     * because payouts are soft-deletable and a trashed payday still holds the
     * unique key that would refuse the next run.
     */
    private function clearPreviousRun(): void
    {
        User::query()->where('email', self::EMAIL)->get()->each->forceDelete();
    }

    private function plan(User $user): BudgetPlan
    {
        $plan = BudgetPlan::factory()->for($user)->create([
            'cadence' => PayCadence::SemiMonthly,
            'months_of_cover' => 6,
            /** Roughly half of the ₱246,000 six months of essentials come to. */
            'emergency_fund_balance' => 12_000_000,
            'savings_pot_balance' => 4_500_000,
        ]);

        foreach (self::PAYCHECKS as $position => $attributes) {
            $paycheck = Paycheck::factory()->for($plan)->create([
                ...$attributes,
                'position' => $position,
            ]);

            $this->items($plan, $paycheck);
        }

        return $plan;
    }

    /**
     * The rows one paycheck pays for.
     *
     * Built through the factory rather than `$plan->expenseItems()->create()`:
     * foreign keys are left out of the model's fillable list on purpose, so a
     * relation's create() would drop `paycheck_id` on the floor.
     */
    private function items(BudgetPlan $plan, Paycheck $paycheck): void
    {
        foreach (self::PLAN[$paycheck->key] as $position => $item) {
            $debt = $item['debt'] ?? null;

            ExpenseItem::factory()->for($plan)->for($paycheck)->create([
                'group' => $item['group'],
                'name' => $item['name'],
                'amount' => $item['amount'],
                'is_debt' => $debt !== null,
                'started_on' => $debt ? now()->startOfMonth()->subMonths($debt['paid']) : null,
                'ends_on' => $debt ? now()->startOfMonth()->addMonths($debt['months'] - 1)->endOfMonth() : null,
                'position' => $position,
            ]);
        }
    }

    /**
     * Walks every opened payday, moves the actuals off the plan where the month
     * says so, and settles it.
     *
     * @return int The number finalized.
     */
    private function settle(User $user): int
    {
        $paydays = $user->payouts()->with(['incomes', 'lines'])->reorder('paid_on')->get();

        foreach ($paydays as $payday) {
            $month = self::MONTHS[(int) $payday->paid_on->format('n')];

            $this->correctLines($payday, $month);
            $this->addUnplanned($payday, $month);
            $this->addExtraIncome($payday, $month);

            /** Dated to the payday, not to the seeding run. */
            $payday->update([
                'status' => PayoutStatus::Finalized,
                'finalized_at' => $payday->paid_on->copy()->endOfDay(),
            ]);
        }

        return $paydays->count();
    }

    /**
     * A bill that came in at a different figure from the forecast.
     *
     * Only `actual` moves. `planned` is the copy taken when the payday opened and
     * is what the variance is measured against, so correcting it would erase the
     * very thing the record exists to show.
     *
     * @param  array<string, mixed>  $month
     */
    private function correctLines(Payout $payday, array $month): void
    {
        $corrections = [
            'Electricity' => $month['electricity'] ?? null,
            'Groceries' => $month['groceries'] ?? null,
            'Internet' => $month['internet'] ?? null,
        ];

        $payday->lines->each(function (PayoutLine $line) use ($corrections, $month): void {
            $actual = $line->group === ExpenseGroup::Allowance
                ? ($month['allowance'] ?? null)
                : ($corrections[$line->name] ?? null);

            if ($actual !== null) {
                $line->update(['actual' => $actual]);
            }
        });
    }

    /**
     * Spending nobody forecast: no expense item behind it and nothing planned,
     * which is exactly how the app records an unplanned line of its own.
     *
     * @param  array<string, mixed>  $month
     */
    private function addUnplanned(Payout $payday, array $month): void
    {
        if (! isset($month['unplanned']) || $payday->paycheck_key !== 'end-month') {
            return;
        }

        $payday->lines()->create([
            'group' => ExpenseGroup::Payables,
            'name' => $month['unplanned']['name'],
            'planned' => 0,
            'actual' => $month['unplanned']['amount'],
            'position' => (int) $payday->lines->max('position') + 1,
        ]);
    }

    /**
     * Money the plan never expected, so it lands with nothing planned against it.
     * The 13th month is a month's pay and arrives with December.
     *
     * @param  array<string, mixed>  $month
     */
    private function addExtraIncome(Payout $payday, array $month): void
    {
        if ($payday->paycheck_key !== 'end-month') {
            return;
        }

        $extra = match (true) {
            (int) $payday->paid_on->format('n') === 12 => ['source' => IncomeSource::ThirteenthMonth, 'label' => '13th month', 'amount' => 5_000_000],
            isset($month['bonus']) => ['source' => IncomeSource::Bonus, 'label' => 'Mid-year bonus', 'amount' => $month['bonus']],
            default => null,
        };

        if ($extra === null) {
            return;
        }

        $payday->incomes()->create([
            'source' => $extra['source'],
            'label' => $extra['label'],
            'planned' => 0,
            'actual' => $extra['amount'],
            'position' => (int) $payday->incomes->max('position') + 1,
        ]);
    }
}
