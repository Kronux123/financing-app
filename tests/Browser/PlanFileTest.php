<?php

use App\Models\BudgetPlan;
use App\Models\User;

/*
 * Submitting a file is not tested here: the browser suite's server drops
 * uploads (see browser.md). The import itself is covered end to end in
 * tests/Feature/BudgetPlanFileTest.php.
 */
beforeEach(function () {
    $this->user = User::factory()->create();

    $this->actingAs($this->user);
});

test('there is no export before a plan is saved', function () {
    $page = visit(route('finance.edit'));

    $page->assertPresent('@import-plan')
        ->assertMissing('@export-plan');
});

test('a saved plan can be exported', function () {
    BudgetPlan::factory()->for($this->user)->withPaychecks()->create();

    $page = visit(route('finance.edit'));

    // Records the file the page hands to the browser instead of saving it.
    $page->script(<<<'JS'
        (() => {
            window.savedFiles = [];
            HTMLAnchorElement.prototype.click = function () {
                window.savedFiles.push(this.download);
            };
        })()
    JS);

    $page->click('@export-plan')
        ->wait(1);

    expect($page->script('window.savedFiles'))
        ->toBe(['kept-budget-plan-'.now()->toDateString().'.json']);

    $page->assertDontSee('Your session has ended')
        ->assertNoJavaScriptErrors();
});

test('the import asks before it replaces the plan', function () {
    BudgetPlan::factory()->for($this->user)->withPaychecks()->create();

    $page = visit(route('finance.edit'));

    $page->click('@import-plan')
        ->assertSee('It replaces your current plan')
        ->assertPresent('@plan-file')
        ->assertSee('Replace my plan')
        ->assertNoJavaScriptErrors();
});

test('the import dialog has no accessibility issues', function () {
    $page = visit(route('finance.edit'));

    $page->click('@import-plan')
        ->assertSee('Import a budget plan')
        // Past the dialog's 200ms fade: mid-flight, its title blends into the
        // backdrop and fails contrast for a frame nobody reads.
        ->wait(0.5)
        ->assertNoAccessibilityIssues();
});

test('the import dialog has no accessibility issues in dark mode', function () {
    $page = visit(route('finance.edit'))->inDarkMode();

    $page->click('@import-plan')
        ->assertSee('Import a budget plan')
        // Past the dialog's 200ms fade: mid-flight, its title blends into the
        // backdrop and fails contrast for a frame nobody reads.
        ->wait(0.5)
        ->assertNoAccessibilityIssues();
});
