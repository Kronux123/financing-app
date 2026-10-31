import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type EmptyPanelProps = {
    icon: LucideIcon;
    title: string;
    children: ReactNode;
    action?: { label: string; href: ComponentProps<typeof Link>['href'] };
    /** Decoration drawn above the copy — a ghost of what will fill the card. */
    preview?: ReactNode;
    'data-test'?: string;
};

/**
 * What a dashboard card says while it has nothing real to show. Says why, and
 * where the data comes from, rather than drawing an empty frame.
 */
export function EmptyPanel({
    icon: Icon,
    title,
    children,
    action,
    preview,
    'data-test': dataTest,
}: EmptyPanelProps) {
    return (
        <div
            data-test={dataTest}
            className="flex flex-col items-center gap-3 py-8 text-center"
        >
            {preview}
            <span className="flex size-10 items-center justify-center rounded-full border border-border bg-muted/60 text-muted-foreground">
                <Icon aria-hidden className="size-5" />
            </span>
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="max-w-sm text-sm text-muted-foreground">{children}</p>
            {action && (
                <Button variant="outline" size="sm" className="mt-1" asChild>
                    <Link href={action.href}>{action.label}</Link>
                </Button>
            )}
        </div>
    );
}
