<?php

use App\Actions\Finance\StatutoryDeductions;
use App\Enums\PayCadence;
use App\Models\User;

/** Pesos in, so the cases read the way a payslip does. */
function deductionsFor(float $grossPesos): array
{
    return app(StatutoryDeductions::class)->handle((int) round($grossPesos * 100));
}

/**
 * A plan paid from gross, in the shape the page sends it. The paycheck amounts
 * are deliberately wrong: the server works them out itself.
 *
 * @return array<string, mixed>
 */
function grossPlanPayload(string $cadence, ?float $gross): array
{
    $paychecks = $cadence === 'monthly'
        ? [['id' => 'monthly', 'label' => 'Monthly pay', 'dayOfMonth' => 'last', 'amount' => 1, 'savesRemainder' => false]]
        : [
            ['id' => 'mid-month', 'label' => '15th', 'dayOfMonth' => 15, 'amount' => 1, 'savesRemainder' => false],
            ['id' => 'end-month', 'label' => 'End of month', 'dayOfMonth' => 'last', 'amount' => 1, 'savesRemainder' => false],
        ];

    return [
        'cadence' => $cadence,
        'grossMonthly' => $gross,
        'emergencyFund' => ['monthsOfCover' => 3, 'balance' => 0],
        'savingsPot' => ['balance' => 0],
        'paychecks' => $paychecks,
        'items' => [],
    ];
}

// The worked example: every contribution at its usual size, tax in the 20% band.
test('a forty thousand gross loses all three contributions and tax', function () {
    expect(deductionsFor(40_000))->toMatchArray([
        'sss' => 175_000,
        'philhealth' => 100_000,
        'pagibig' => 20_000,
        'contributions' => 295_000,
        'taxable' => 3_705_000,
        // 1,875 + 20% of (37,050 − 33,333)
        'tax' => 261_840,
        'takeHome' => 3_443_160,
    ]);
});

test('pay under the tax line is taxed nothing', function () {
    expect(deductionsFor(20_000))->toMatchArray([
        'sss' => 100_000,
        'philhealth' => 50_000,
        'pagibig' => 20_000,
        'tax' => 0,
        'takeHome' => 1_830_000,
    ]);
});

// Every cap and floor at once: SSS at its highest credit, PhilHealth at its
// ceiling, Pag-IBIG at its cap, and tax in the 25% band.
test('high pay meets every ceiling', function () {
    expect(deductionsFor(150_000))->toMatchArray([
        'sss' => 175_000,
        'philhealth' => 250_000,
        'pagibig' => 20_000,
        // 8,541.80 + 25% of (145,550 − 66,667)
        'tax' => 2_826_255,
        'takeHome' => 11_728_745,
    ]);
});

test('low pay is charged on the floors, not on the pay', function () {
    expect(deductionsFor(5_000))->toMatchArray([
        'sss' => 25_000,
        'philhealth' => 25_000,
        'pagibig' => 10_000,
        'tax' => 0,
    ]);
});

test('pagibig drops to one percent at the low pay line', function () {
    expect(deductionsFor(1_500)['pagibig'])->toBe(1_500)
        ->and(deductionsFor(1_500.01)['pagibig'])->toBe(3_000);
});

// ₱5,250 is where the ₱5,500 credit starts, not ₱5,500 itself.
test('sss places pay in the nearest five hundred peso credit', function (float $gross, int $share) {
    expect(deductionsFor($gross)['sss'])->toBe($share);
})->with([
    'just under a step' => [5_249.99, 25_000],
    'on a step' => [5_250, 27_500],
    'just under the top credit' => [34_749.99, 172_500],
    'at the top credit' => [34_750, 175_000],
]);

// The floors still charge on nothing, so take-home has to stop at zero.
test('no gross takes home nothing rather than less than nothing', function () {
    expect(deductionsFor(0))->toMatchArray(['tax' => 0, 'takeHome' => 0]);
});

test('monthly pay takes home everything after deductions', function () {
    expect(app(StatutoryDeductions::class)->paycheckAmounts(PayCadence::Monthly, 4_000_000))
        ->toBe(['monthly' => 3_443_160]);
});

// Half the gross on each. Tax is split across both; the contributions all come
// off the end of the month.
test('semi-monthly pay splits the tax and leaves contributions to the end of the month', function () {
    expect(app(StatutoryDeductions::class)->paycheckAmounts(PayCadence::SemiMonthly, 4_000_000))
        ->toBe(['mid-month' => 1_869_080, 'end-month' => 1_574_080]);
});

test('saving a gross works out the take-home on the server', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('finance.update'), grossPlanPayload('semi-monthly', 40_000))
        ->assertSessionHasNoErrors();

    $plan = $user->refresh()->budgetPlan;

    expect($plan->monthly_gross)->toBe(4_000_000)
        ->and($plan->paychecks->pluck('amount', 'key')->all())
        ->toBe(['mid-month' => 1_869_080, 'end-month' => 1_574_080]);
});

test('a plan without a gross keeps the take-home it was sent', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('finance.update'), grossPlanPayload('monthly', null))
        ->assertSessionHasNoErrors();

    $plan = $user->refresh()->budgetPlan;

    expect($plan->monthly_gross)->toBeNull()
        ->and($plan->paychecks->first()->amount)->toBe(100);
});

test('the plan goes back out with its gross in pesos', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->put(route('finance.update'), grossPlanPayload('monthly', 40_000));

    $this->get(route('finance.edit'))
        ->assertInertia(fn ($page) => $page
            ->where('plan.grossMonthly', 40_000)
            ->where('plan.paychecks.0.amount', 34_431.6));
});

test('the preview breaks a gross down in pesos', function () {
    $this->actingAs(User::factory()->create())
        ->getJson(route('finance.deductions', ['gross' => 40_000, 'cadence' => 'semi-monthly']))
        ->assertOk()
        ->assertJson([
            'gross' => 40_000,
            'sss' => 1_750,
            'philhealth' => 1_000,
            'pagibig' => 200,
            'tax' => 2_618.4,
            'total' => 5_568.4,
            'takeHome' => 34_431.6,
            'paychecks' => ['mid-month' => 18_690.8, 'end-month' => 15_740.8],
            'effectiveYear' => config('payroll.effective_year'),
        ]);
});

test('the preview refuses a gross that is not an amount', function () {
    $this->actingAs(User::factory()->create())
        ->getJson(route('finance.deductions', ['gross' => -1, 'cadence' => 'monthly']))
        ->assertJsonValidationErrors('gross');
});

test('guests cannot preview deductions', function () {
    $this->getJson(route('finance.deductions', ['gross' => 40_000, 'cadence' => 'monthly']))
        ->assertUnauthorized();
});
