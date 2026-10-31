import { Link } from '@inertiajs/react';
import {
    Activity,
    DollarSign,
    Landmark,
    LayoutGrid,
    Wallet,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import dashboardRoutes from '@/routes/dashboard';
import { index as debt } from '@/routes/debt';
import { edit as finance } from '@/routes/finance';
import { index as payouts } from '@/routes/payouts';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Activities',
        href: dashboardRoutes.activities(),
        icon: Activity,
    },
    {
        title: 'Finance',
        href: finance(),
        icon: DollarSign,
    },
    {
        title: 'Debt',
        href: debt(),
        icon: Landmark,
    },
    {
        title: 'Payouts',
        href: payouts(),
        icon: Wallet,
    },
];

export function AppSidebar() {
    return (
        /*
         * `floating`, not `inset`. Inset rounds the content pane and leaves the
         * sidebar flush against the edge, which is the wrong way round once the
         * content is transparent — and it also puts `bg-sidebar` on the whole
         * wrapper (see `ui/sidebar.tsx`), an opaque sheet that was hiding the
         * backdrop on every signed-in page. Floating makes the sidebar its own
         * rounded panel and leaves the background alone.
         */
        <Sidebar collapsible="icon" variant="floating">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
