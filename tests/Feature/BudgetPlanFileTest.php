<?php

use App\Enums\ExpenseGroup;
use App\Enums\PayCadence;
use App\Models\BudgetPlan;
use App\Models\ExpenseItem;
use App\Models\User;
use Illuminate\Http\UploadedFile;

/** The file the export hands back, as an upload the import will accept. */
function exportedPlanFile(User $user): UploadedFile
{
    $json = test()->actingAs($user)->get(route('finance.export'))->getContent();

    return UploadedFile::fake()->createWithContent('kept-budget-plan.json', $json);
}

/** @param  array<string, mixed>  $contents */
function planFileWith(array $contents): UploadedFile
{
    return UploadedFile::fake()->createWithContent('plan.json', json_encode($contents));
}

test('guests can neither export nor import a plan', function () {
    $this->get(route('finance.export'))->assertRedirect(route('login'));
    $this->post(route('finance.import'))->assertRedirect(route('login'));
});

/*
 * The page asks for the file as JSON so that a session which has ended gets a
 * 401 it can explain. A plain link was handed the login page instead, and the
 * browser saved that as the download.
 */
test('a signed-out export asked for as json is a 401, not the login page', function () {
    $this->getJson(route('finance.export'))->assertUnauthorized();
});

test('the export is the saved plan, named so it can be recognised again', function () {
    $this->travelTo('2026-11-01 09:00');

    $plan = BudgetPlan::factory()->withPaychecks()->withPayables()->create();

    $response = $this->actingAs($plan->user)->get(route('finance.export'));

    $response->assertOk()
        ->assertHeader('Content-Disposition', 'attachment; filename="kept-budget-plan-2026-11-01.json"')
        ->assertJsonPath('app', 'kept')
        ->assertJsonPath('version', 1)
        ->assertJsonPath('plan.cadence', 'monthly')
        // Pesos, as the pages read them — the file is not the table shape.
        ->assertJsonPath('plan.paychecks.0.amount', 25_000)
        ->assertJsonPath('plan.groups.0.items.0.name', 'Rent')
        ->assertJsonPath('plan.groups.0.items.0.amount', 9_000);
});

test('there is nothing to export before a plan is saved', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('finance.export'))
        ->assertNotFound();
});

// The case the feature is for: a plan carried from one install to another.
test('an exported plan imports into a fresh account as the same plan', function () {
    $source = BudgetPlan::factory()->semiMonthly()->withPaychecks()->withPayables()->create([
        'months_of_cover' => 6,
        'emergency_fund_balance' => 1_234_550,
    ]);
    ExpenseItem::factory()->for($source)->for($source->paychecks()->firstOrFail())->create([
        'group' => ExpenseGroup::Payables,
        'name' => 'Laptop installment',
        'amount' => 250_000,
        'is_debt' => true,
        'started_on' => '2026-01-01',
        'ends_on' => '2027-06-30',
    ]);

    $file = exportedPlanFile($source->user);
    $newcomer = User::factory()->create();

    $this->actingAs($newcomer)
        ->post(route('finance.import'), ['file' => $file])
        ->assertRedirect(route('finance.edit'))
        ->assertSessionHasNoErrors();

    $imported = $newcomer->budgetPlan()->with(['paychecks', 'expenseItems'])->sole();

    expect($imported->cadence)->toBe(PayCadence::SemiMonthly)
        ->and($imported->months_of_cover)->toBe(6)
        ->and($imported->emergency_fund_balance)->toBe(1_234_550)
        ->and($imported->paychecks->pluck('amount', 'key')->all())
        ->toBe($source->paychecks->pluck('amount', 'key')->all())
        ->and($imported->expenseItems->pluck('name')->sort()->values()->all())
        ->toBe(['Laptop installment', 'Rent']);

    $laptop = $imported->expenseItems->firstWhere('name', 'Laptop installment');

    expect($laptop->amount)->toBe(250_000)
        ->and($laptop->is_debt)->toBeTrue()
        ->and($laptop->ends_on->toDateString())->toBe('2027-06-30');
});

test('an import replaces the plan that was there', function () {
    $source = BudgetPlan::factory()->withPaychecks()->withPayables()->create();
    $existing = BudgetPlan::factory()->withPaychecks()->create();
    ExpenseItem::factory()->for($existing)->for($existing->paychecks()->firstOrFail())->create([
        'group' => ExpenseGroup::Allowance,
        'name' => 'Old allowance',
    ]);

    // Exported first: the helper signs in as the source to fetch it.
    $file = exportedPlanFile($source->user);

    $this->actingAs($existing->user)
        ->post(route('finance.import'), ['file' => $file])
        ->assertSessionHasNoErrors();

    expect($existing->expenseItems()->pluck('name')->all())->toBe(['Rent'])
        ->and(BudgetPlan::where('user_id', $existing->user_id)->count())->toBe(1);
});

// Row ids in a file are someone else's numbering. Honouring one would let a file
// name a row in another plan and have it rewritten.
test('row ids in the file are never used to find a row', function () {
    $victim = BudgetPlan::factory()->withPaychecks()->withPayables()->create();
    $victimRow = $victim->expenseItems()->sole();
    $importer = User::factory()->create();

    $file = planFileWith([
        'app' => 'kept',
        'version' => 1,
        'plan' => [
            'cadence' => 'monthly',
            'grossMonthly' => null,
            'paychecks' => [['id' => 'monthly', 'label' => 'Monthly pay', 'dayOfMonth' => 'last', 'amount' => 30_000, 'savesRemainder' => false]],
            'groups' => [['id' => 'payables', 'items' => [
                ['id' => (string) $victimRow->id, 'name' => 'Hijacked', 'amount' => 1, 'paycheckId' => 'monthly'],
            ]]],
            'emergencyFund' => ['monthsOfCover' => 3, 'balance' => 0],
            'savingsPot' => ['balance' => 0],
        ],
    ]);

    $this->actingAs($importer)
        ->post(route('finance.import'), ['file' => $file])
        ->assertSessionHasNoErrors();

    expect($victimRow->refresh()->name)->toBe('Rent')
        ->and($importer->budgetPlan->expenseItems()->sole()->name)->toBe('Hijacked');
});

test('a file that is not a kept plan is refused with one message', function (UploadedFile $file) {
    $plan = BudgetPlan::factory()->withPaychecks()->withPayables()->create();

    $this->actingAs($plan->user)
        ->post(route('finance.import'), ['file' => $file])
        ->assertSessionHasErrors(['file' => 'This is not a budget plan exported from Kept.']);

    expect(session('errors')->count())->toBe(1)
        ->and($plan->expenseItems()->sole()->name)->toBe('Rent');
})->with([
    'not json' => fn () => UploadedFile::fake()->createWithContent('plan.json', 'cadence,amount'),
    'another app' => fn () => planFileWith(['app' => 'something-else', 'version' => 1, 'plan' => []]),
    'a newer format' => fn () => planFileWith(['app' => 'kept', 'version' => 2, 'plan' => []]),
    'no plan inside' => fn () => planFileWith(['app' => 'kept', 'version' => 1]),
]);

// The plan inside is held to the same rules as the Save button.
test('a kept file with a broken plan is refused, and the plan is left alone', function () {
    $plan = BudgetPlan::factory()->withPaychecks()->withPayables()->create();

    $file = planFileWith([
        'app' => 'kept',
        'version' => 1,
        'plan' => [
            'cadence' => 'fortnightly',
            'paychecks' => 'not a list',
            'groups' => [['id' => 'payables', 'items' => ['not a row']]],
        ],
    ]);

    $this->actingAs($plan->user)
        ->post(route('finance.import'), ['file' => $file])
        ->assertSessionHasErrors('cadence');

    expect(session('errors')->count())->toBe(1)
        ->and($plan->expenseItems()->sole()->name)->toBe('Rent');
});

test('an import needs a file', function () {
    $this->actingAs(User::factory()->create())
        ->post(route('finance.import'))
        ->assertSessionHasErrors('file');
});
