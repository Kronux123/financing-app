import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { PageBackdrop } from '@/components/page-backdrop';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <PageBackdrop variant="app" />
            <AppSidebar />
            {/*
             * `bg-transparent` overrides the `bg-background` that `SidebarInset`
             * ships with, which would otherwise cover the backdrop. The sidebar
             * itself stays opaque — it is a navigation surface and wants to read
             * as one, and the glow behind a dense content pane is quite enough.
             */}
            <AppContent
                variant="sidebar"
                className="relative z-10 overflow-x-hidden bg-transparent"
            >
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {children}
            </AppContent>
        </AppShell>
    );
}
