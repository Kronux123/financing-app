import { Link } from '@inertiajs/react';
import type { ComponentProps, ReactNode } from 'react';
import type { SpriteName } from '@/components/pixel-art';
import { PixelArt } from '@/components/pixel-art';
import { Button } from '@/components/ui/button';

type EmptyPanelProps = {
    /** The sprite that stands for what will fill this card. */
    art: SpriteName;
    title: string;
    children: ReactNode;
    action?: { label: string; href: ComponentProps<typeof Link>['href'] };
    'data-test'?: string;
};

/**
 * What a card says while it has nothing real to show. Says why, and where the
 * data comes from, rather than drawing an empty frame.
 */
export function EmptyPanel({
    art,
    title,
    children,
    action,
    'data-test': dataTest,
}: EmptyPanelProps) {
    return (
        <div
            data-test={dataTest}
            className="flex flex-col items-center gap-3 py-8 text-center"
        >
            <PixelArt sprite={art} size={48} className="mb-1" />
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
