import type { BudgetPlan } from '@/lib/budget';

/**
 * A gross broken down by the server — see StatutoryDeductions, which holds the
 * only copy of the rates and the maths. Pesos, like every amount on the page.
 */
export type Deductions = {
    gross: number;
    sss: number;
    philhealth: number;
    pagibig: number;
    contributions: number;
    taxable: number;
    tax: number;
    total: number;
    takeHome: number;
    /** Take-home per paycheck, keyed by paycheck id. */
    paychecks: Record<string, number>;
    /** The year the rates were published for. */
    effectiveYear: number;
};

export const isPaidFromGross = (plan: BudgetPlan): boolean => {
    return plan.grossMonthly !== null && plan.grossMonthly !== undefined;
};

/**
 * The plan with each paycheck carrying the take-home the server worked out.
 *
 * Hands back the same plan when nothing would change, so a page that opens on a
 * saved gross does not read itself as edited the moment the preview arrives.
 */
export const withPaycheckAmounts = (
    plan: BudgetPlan,
    amounts: Record<string, number>,
): BudgetPlan => {
    const changes = plan.paychecks.some(
        (paycheck) =>
            amounts[paycheck.id] !== undefined &&
            amounts[paycheck.id] !== paycheck.amount,
    );

    if (!changes) {
        return plan;
    }

    return {
        ...plan,
        paychecks: plan.paychecks.map((paycheck) =>
            amounts[paycheck.id] === undefined
                ? paycheck
                : { ...paycheck, amount: amounts[paycheck.id] },
        ),
    };
};
