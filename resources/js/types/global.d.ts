import type { Auth } from '@/types/auth';

declare module 'react' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            /** Paydays waiting to be reviewed — see HandleInertiaRequests. */
            pendingPaydays: number;
            /** Pages whose walkthrough is finished or skipped — see HandleInertiaRequests. */
            seenWalkthroughs: string[];
            [key: string]: unknown;
        };
    }
}
