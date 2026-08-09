import { Head, Link } from '@inertiajs/react';
import { toast } from 'sonner';
import { PaycheckCard } from '@/components/finance/paycheck-card';
import { PlanSummary } from '@/components/finance/plan-summary';
import { SavingsCard } from '@/components/finance/savings-card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useBudgetPlanDraft } from '@/hooks/use-budget-plan';
import type { EmergencyFund, ExpenseItem, PayCadence } from '@/lib/budget';
import {
    cadenceOptions,
    createId,
    reassignTo,
    withGroupAmount,
} from '@/lib/budget';
import { dashboard } from '@/routes';
import { edit as financeRoute } from '@/routes/finance';

export default function Finance() {
    const { plan, isDirty, update: updatePlan, save } = useBudgetPlanDraft();

    const handleCadenceChange = (value: string) => {
        if (value !== 'monthly' && value !== 'semi-monthly') {
            return;
        }

        updatePlan(reassignTo(plan, value as PayCadence));
    };

    const handleIncomeChange = (paycheckId: string, amount: number) => {
        updatePlan({
            ...plan,
            paychecks: plan.paychecks.map((paycheck) =>
                paycheck.id === paycheckId ? { ...paycheck, amount } : paycheck,
            ),
        });
    };

    const handleSavesRemainderChange = (
        paycheckId: string,
        savesRemainder: boolean,
    ) => {
        updatePlan({
            ...plan,
            paychecks: plan.paychecks.map((paycheck) =>
                paycheck.id === paycheckId
                    ? { ...paycheck, savesRemainder }
                    : paycheck,
            ),
        });
    };

    const handleEmergencyFundChange = (patch: Partial<EmergencyFund>) => {
        updatePlan({
            ...plan,
            emergencyFund: { ...plan.emergencyFund, ...patch },
        });
    };

    const handleGroupAmountChange = (
        groupId: string,
        paycheckId: string,
        amount: number,
    ) => {
        updatePlan(withGroupAmount(plan, groupId, paycheckId, amount));
    };

    const handleItemAdd = (groupId: string, paycheckId: string) => {
        updatePlan({
            ...plan,
            groups: plan.groups.map((group) =>
                group.id === groupId
                    ? {
                          ...group,
                          items: [
                              ...group.items,
                              {
                                  id: createId('item'),
                                  name: '',
                                  amount: 0,
                                  paycheckId,
                              },
                          ],
                      }
                    : group,
            ),
        });
    };

    const handleItemChange = (
        groupId: string,
        itemId: string,
        patch: Partial<ExpenseItem>,
    ) => {
        updatePlan({
            ...plan,
            groups: plan.groups.map((group) =>
                group.id === groupId
                    ? {
                          ...group,
                          items: group.items.map((item) =>
                              item.id === itemId ? { ...item, ...patch } : item,
                          ),
                      }
                    : group,
            ),
        });
    };

    const handleItemRemove = (groupId: string, itemId: string) => {
        updatePlan({
            ...plan,
            groups: plan.groups.map((group) =>
                group.id === groupId
                    ? {
                          ...group,
                          items: group.items.filter(
                              (item) => item.id !== itemId,
                          ),
                      }
                    : group,
            ),
        });
    };

    /**
     * Raised here rather than flashed from the server: the save is a round trip
     * now, and this is the signal that it landed.
     */
    const handleSave = () => save(() => toast.success('Budget plan saved.'));

    return (
        <>
            <Head title="Budget plan" />

            <div className="flex w-full flex-col gap-6 p-4 md:p-6">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Budget plan
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Set how you get paid, then give every peso a job
                            before it arrives.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {isDirty && (
                            <span className="text-sm text-muted-foreground">
                                Unsaved changes
                            </span>
                        )}
                        <Button
                            data-test="save-plan"
                            disabled={!isDirty}
                            onClick={handleSave}
                        >
                            Save plan
                        </Button>
                    </div>
                </header>

                <div className="grid items-start gap-6 xl:grid-cols-[1.7fr_1fr]">
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="cadence">How you get paid</Label>
                            <ToggleGroup
                                id="cadence"
                                type="single"
                                variant="outline"
                                value={plan.cadence}
                                onValueChange={handleCadenceChange}
                                className="w-full sm:w-auto"
                            >
                                {cadenceOptions.map((option) => (
                                    <ToggleGroupItem
                                        key={option.value}
                                        value={option.value}
                                        data-test={`cadence-${option.value}`}
                                        className="px-4"
                                    >
                                        {option.label}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                            <p className="text-xs text-muted-foreground">
                                {plan.cadence === 'semi-monthly'
                                    ? 'Twice a month — the 15th and the last day.'
                                    : 'Once a month, on the last day.'}
                            </p>
                        </div>

                        <div
                            className={
                                plan.cadence === 'semi-monthly'
                                    ? 'grid gap-4 md:grid-cols-2'
                                    : 'grid gap-4'
                            }
                        >
                            {plan.paychecks.map((paycheck) => (
                                <PaycheckCard
                                    key={paycheck.id}
                                    plan={plan}
                                    paycheck={paycheck}
                                    otherPaycheck={plan.paychecks.find(
                                        (item) => item.id !== paycheck.id,
                                    )}
                                    onIncomeChange={(amount) =>
                                        handleIncomeChange(paycheck.id, amount)
                                    }
                                    onSavesRemainderChange={(savesRemainder) =>
                                        handleSavesRemainderChange(
                                            paycheck.id,
                                            savesRemainder,
                                        )
                                    }
                                    onGroupAmountChange={
                                        handleGroupAmountChange
                                    }
                                    onItemAdd={handleItemAdd}
                                    onItemChange={handleItemChange}
                                    onItemRemove={handleItemRemove}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <PlanSummary plan={plan} />

                        <SavingsCard
                            plan={plan}
                            onMonthsOfCoverChange={(monthsOfCover) =>
                                handleEmergencyFundChange({ monthsOfCover })
                            }
                            onBalanceChange={(balance) =>
                                handleEmergencyFundChange({ balance })
                            }
                            onPotBalanceChange={(balance) =>
                                updatePlan({
                                    ...plan,
                                    savingsPot: { ...plan.savingsPot, balance },
                                })
                            }
                        />

                        <Button variant="secondary" asChild size="sm">
                            <Link href={dashboard()}>Back to dashboard</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}

Finance.layout = {
    breadcrumbs: [
        {
            title: 'Finance',
            href: financeRoute(),
        },
    ],
};
