import type { SpriteName } from '@/components/pixel-art';
import type { ActivityPagination } from '@/lib/activities';
import type { BudgetPlan } from '@/lib/budget';
import { isPlanPopulated } from '@/lib/budget';
import type { Payout } from '@/lib/payout';
import type { SavedMonth } from '@/lib/savings';

/**
 * The pages with a walkthrough. Mirrors App\Enums\WalkthroughPage — a page
 * missing there gets a 404 when its walkthrough is recorded.
 */
export type WalkthroughPage =
    | 'dashboard'
    | 'finance'
    | 'payouts'
    | 'debt'
    | 'months'
    | 'activities';

export type WalkthroughStep = {
    /**
     * The `data-walkthrough` value of the element to spotlight. Left out for a
     * step that is about the page as a whole, which shows in the middle.
     */
    target?: string;
    title: string;
    body: string;
    art: SpriteName;
};

/**
 * Pulled into its own attribute rather than reusing `data-test`, so a test id
 * can be renamed without quietly breaking a walkthrough, and the other way
 * about.
 */
export const walkthroughTarget = (
    name: string,
): { 'data-walkthrough': string } => ({ 'data-walkthrough': name });

/** The props a page's own data arrives in, before any sample stands in. */
export type OwnProps = {
    plan?: BudgetPlan | null;
    payouts?: Payout[];
    savings?: SavedMonth[];
    pagination?: ActivityPagination;
};

/**
 * Whether the page has the user's own data to walk through. When it does not,
 * the walkthrough shows the sample account instead, so every step has
 * something to point at — see lib/sample-account.ts.
 */
export const hasOwnData: Record<WalkthroughPage, (props: OwnProps) => boolean> =
    {
        dashboard: ({ plan }) => plan != null && isPlanPopulated(plan),
        finance: ({ plan }) => plan != null,
        payouts: ({ payouts }) => (payouts?.length ?? 0) > 0,
        debt: ({ plan }) =>
            plan?.groups.some((group) =>
                group.items.some((item) => item.isDebt === true),
            ) ?? false,
        months: ({ savings }) => (savings?.length ?? 0) > 0,
        activities: ({ pagination }) => (pagination?.totalRows ?? 0) > 0,
    };

/** Every walkthrough ends on the button that takes it again. */
const closingStep = (art: SpriteName): WalkthroughStep => ({
    target: 'walkthrough-replay',
    title: 'That’s the tour',
    body: 'You can take it again from here whenever you like.',
    art,
});

/**
 * The steps for each page, in the order they sit on the page so the spotlight
 * moves down it rather than jumping about. A step whose element is not on the
 * page right now — the paydays banner once nothing is waiting — is skipped.
 *
 * Changing these enough that people should see them again means raising the
 * page's version in WalkthroughPage.php.
 */
export const walkthroughs: Record<WalkthroughPage, WalkthroughStep[]> = {
    dashboard: [
        {
            title: 'Welcome to your dashboard',
            body: 'This is where your plan and your paydays come together. Here is a quick look at what each part tells you.',
            art: 'wallet',
        },
        {
            target: 'pending-paydays',
            title: 'Paydays waiting for you',
            body: 'A payday only counts toward your savings once you finalize it. Review what actually came in and went out, then finalize.',
            art: 'moneybag',
        },
        {
            target: 'pay-flow',
            title: 'Where your pay goes',
            body: 'This month’s pay, split into payables, allowance and savings. Anything not given a job yet shows as unassigned.',
            art: 'envelope',
        },
        {
            target: 'total-saved',
            title: 'Total saved',
            body: 'Your emergency fund and savings pot together, and how much your plan puts by each month.',
            art: 'piggy-bank',
        },
        {
            target: 'emergency-fund',
            title: 'Emergency fund',
            body: 'Sized from your payables and allowance. The ring fills as you save, and Adjust takes you to the plan to change it.',
            art: 'umbrella',
        },
        {
            target: 'outstanding-debt',
            title: 'Debt and what it frees up',
            body: 'What you still owe, and how much comes back to you each month as payables finish.',
            art: 'mountain',
        },
        {
            target: 'monthly-savings',
            title: 'Monthly savings',
            body: 'One bar for each month you finalized, against the goal your plan sets. Finalize paydays to fill it in.',
            art: 'chart',
        },
        {
            target: 'recent-activity',
            title: 'Recent activity',
            body: 'The latest money in and out, straight from your paydays. Show all opens the full log.',
            art: 'receipt',
        },
        closingStep('wallet'),
    ],
    finance: [
        {
            title: 'Your budget plan',
            body: 'Tell the app how you get paid, then give every peso a job before it arrives. Everything else in the app is worked out from this.',
            art: 'calculator',
        },
        {
            target: 'pay-schedule',
            title: 'How you get paid',
            body: 'Pick once or twice a month, and whether you enter take-home or gross. From gross, SSS, PhilHealth, Pag-IBIG and tax are worked out for you.',
            art: 'envelope',
        },
        {
            target: 'paychecks',
            title: 'A job for every peso',
            body: 'Split each paycheck into payables, allowance and savings. The meter shows how much has a job, and ticking Debt on a payable puts it on the debt page.',
            art: 'envelope',
        },
        {
            target: 'plan-summary',
            title: 'The whole month',
            body: 'Every paycheck added together, so you can see each edit land on the month as a whole.',
            art: 'calculator',
        },
        {
            target: 'savings-setup',
            title: 'Emergency fund first',
            body: 'Choose how many months it should cover and enter what you have set aside. Savings fill the fund first, then the pot.',
            art: 'umbrella',
        },
        {
            target: 'save-plan',
            title: 'Save when you are done',
            body: 'Nothing is kept until you save. You can also export your plan to a file and import it again.',
            art: 'calculator',
        },
        closingStep('calculator'),
    ],
    payouts: [
        {
            title: 'Your paydays',
            body: 'Each payday opens here by itself on the day, filled in from your plan. You check what really happened, then finalize it.',
            art: 'moneybag',
        },
        {
            target: 'payouts-pending',
            title: 'What is waiting',
            body: 'How many paydays still need a look. The dashboard reminds you too, and so can email.',
            art: 'moneybag',
        },
        {
            target: 'payout-card',
            title: 'Fix what came out different',
            body: 'Change any amount that was not what the plan said. The difference shows beside it, and the bottom line tells you what is left.',
            art: 'receipt',
        },
        {
            target: 'payout-add-line',
            title: 'Something unplanned?',
            body: 'Add a line for a one-off the plan never saw coming, like a repair. Everyday spending belongs in your allowance instead.',
            art: 'receipt',
        },
        {
            target: 'payout-finalize',
            title: 'Finalize it',
            body: 'Finalizing makes the payday part of your history, so it counts toward your savings. You can reopen it if something was wrong.',
            art: 'piggy-bank',
        },
        closingStep('moneybag'),
    ],
    debt: [
        {
            title: 'Your debt',
            body: 'Every payable you have marked as debt, and what is left on it. Nothing is typed in here: debts live on your plan.',
            art: 'mountain',
        },
        {
            target: 'debt-total',
            title: 'Total owed',
            body: 'Everything still owed, and when you will be debt-free at the payments you make now.',
            art: 'mountain',
        },
        {
            target: 'debt-list',
            title: 'Each debt',
            body: 'What is left on each one and what goes to it a month. With a start date on the plan, a bar shows how far through you are.',
            art: 'mountain',
        },
        {
            target: 'debt-order',
            title: 'Pick an order',
            body: 'Put the smallest first to clear one quickly, or the biggest first to see what weighs most.',
            art: 'mountain',
        },
        {
            target: 'edit-on-plan',
            title: 'Change a debt',
            body: 'Tick Debt on a payable in your plan and it shows up here.',
            art: 'calculator',
        },
        closingStep('mountain'),
    ],
    months: [
        {
            title: 'Savings calendar',
            body: 'Every month of the year side by side, so you can see how each one did against your goal.',
            art: 'calendar',
        },
        {
            target: 'calendar-year',
            title: 'Your year so far',
            body: 'What you have saved this year and how it is tracking toward your goal. The arrows step between years.',
            art: 'chart',
        },
        {
            target: 'calendar-summary',
            title: 'The months worth knowing',
            body: 'Your best and lowest months, the monthly average, and how many months hit the goal.',
            art: 'star',
        },
        {
            target: 'calendar-months',
            title: 'Month by month',
            body: 'Each month is shaded by how close it came to the goal. Download any one as a spreadsheet or a PDF.',
            art: 'calendar',
        },
        closingStep('calendar'),
    ],
    activities: [
        {
            title: 'Activity log',
            body: 'Every peso in and out of every payday, newest first.',
            art: 'receipt',
        },
        {
            target: 'activities-table',
            title: 'Where each row comes from',
            body: 'Money in shows with a plus and money out with a minus. Spending nobody planned is tagged, and a payday you have not finalized shows as pending.',
            art: 'receipt',
        },
        {
            target: 'activities-pagination',
            title: 'See more at once',
            body: 'Page through, or show more rows at a time. The app remembers how many you like.',
            art: 'receipt',
        },
        closingStep('receipt'),
    ],
};
