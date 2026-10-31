<?php

use App\Actions\Payouts\OpenPayoutsForPlan;
use App\Models\BudgetPlan;
use App\Models\Payout;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/*
 * Time is pinned for the same reason as in OpenPayoutsTest: May 2026 ends on a
 * Sunday, so the payday that is due on 10 June is Friday 29 May.
 */
beforeEach(function () {
    $this->travelTo('2026-06-10 09:00');
});

/** A plan old enough for last month's payday to be due. */
function planDueAPayday(): BudgetPlan
{
    $plan = BudgetPlan::factory()->withPaychecks()->withPayables()->create();

    $plan->forceFill(['created_at' => now()->subMonths(6)])->save();

    return $plan->refresh();
}

// Nothing runs the scheduler here, as on Herd: the visit alone has to do it.
test('a page that reads the ledger opens the payday that is due', function (string $route) {
    $plan = planDueAPayday();

    $this->actingAs($plan->user)->get(route($route))->assertOk();

    $payout = Payout::query()->sole();

    expect($payout->user_id)->toBe($plan->user_id)
        ->and($payout->paid_on->toDateString())->toBe('2026-05-29')
        ->and($payout->lines)->toHaveCount(1);
})->with(['dashboard', 'dashboard.months', 'dashboard.activities', 'payouts.index']);

test('the paydays page lists the payday it has just opened', function () {
    $plan = planDueAPayday();

    $this->actingAs($plan->user)
        ->get(route('payouts.index'))
        ->assertInertia(fn ($page) => $page->has('payouts', 1));
});

test('visiting again opens nothing more', function () {
    $plan = planDueAPayday();

    $this->actingAs($plan->user)->get(route('payouts.index'))->assertOk();
    $this->actingAs($plan->user)->get(route('dashboard'))->assertOk();

    expect(Payout::count())->toBe(1);
});

test('only the visitor\'s own paydays are opened', function () {
    planDueAPayday();
    $visitor = planDueAPayday();

    $this->actingAs($visitor->user)->get(route('payouts.index'))->assertOk();

    expect(Payout::query()->sole()->user_id)->toBe($visitor->user_id);
});

test('a user with no plan sees the page and nothing is opened', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('payouts.index'))
        ->assertOk();

    expect(Payout::count())->toBe(0);
});

/*
 * A visit and the scheduled run can both pass the "already open?" check before
 * either has written. The row written in between here stands in for the other
 * one, and the loser has to step aside rather than fail the page.
 *
 * Only the stepping aside is asserted. The stand-in row is written inside the
 * loser's own transaction, so it rolls back with it — a real competitor would
 * have committed on its own connection and stayed.
 */
test('losing a race to open the same payday is not an error', function () {
    $plan = planDueAPayday();
    $raced = false;

    Payout::creating(function (Payout $payout) use (&$raced): void {
        if ($raced) {
            return;
        }

        $raced = true;

        DB::table('payouts')->insert([
            'user_id' => $payout->user_id,
            'paycheck_key' => $payout->paycheck_key,
            'paycheck_label' => $payout->paycheck_label,
            'paid_on' => $payout->paid_on,
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    });

    $opened = app(OpenPayoutsForPlan::class)->handle($plan, now());

    expect($raced)->toBeTrue()
        ->and($opened)->toBe(0);
});
