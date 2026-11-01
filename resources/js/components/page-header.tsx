import type { ReactNode } from 'react';
import type { SpriteName } from '@/components/pixel-art';
import { SpriteTile } from '@/components/pixel-art';

type PageHeaderProps = {
    title: string;
    description?: ReactNode;
    /** Controls that act on the whole page, such as Save. */
    actions?: ReactNode;
    /** The sprite for what this page is about, shown on a tile by the title. */
    art?: SpriteName;
};

/**
 * The title block every app page opens with, so they all start the same way:
 * the page's sprite, its name, one line on what it is for, and its page-wide
 * actions opposite. The description is capped so it never runs the width of a
 * wide screen.
 */
export function PageHeader({
    title,
    description,
    actions,
    art,
}: PageHeaderProps) {
    return (
        <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
                {art && <SpriteTile sprite={art} />}
                <div className="min-w-0 space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {title}
                    </h1>
                    {description && (
                        <p className="max-w-prose text-sm text-muted-foreground">
                            {description}
                        </p>
                    )}
                </div>
            </div>
            {actions && (
                <div className="flex flex-wrap items-center gap-3">
                    {actions}
                </div>
            )}
        </header>
    );
}
