import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            asChild
                            isActive={isCurrentUrl(item.href)}
                            tooltip={{ children: item.title }}
                        >
                            <Link
                                href={item.href}
                                prefetch
                                data-test={`nav-${item.title.toLowerCase()}`}
                            >
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                                {/*
                                 * Inside the link, so the count is part of its
                                 * name: "Payouts, 2 awaiting review".
                                 */}
                                {item.badge && item.badge.count > 0 && (
                                    <span className="sr-only">
                                        , {item.badge.count} {item.badge.label}
                                    </span>
                                )}
                            </Link>
                        </SidebarMenuButton>
                        {item.badge && item.badge.count > 0 && (
                            <SidebarMenuBadge
                                aria-hidden
                                data-test={`nav-${item.title.toLowerCase()}-badge`}
                                className="rounded-full bg-jade/15 text-jade-ink peer-hover/menu-button:text-jade-ink peer-data-[active=true]/menu-button:text-jade-ink"
                            >
                                {item.badge.count}
                            </SidebarMenuBadge>
                        )}
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
