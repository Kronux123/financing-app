import type { ReactNode } from 'react';

type PageHeaderProps = {
    title: string;
    description?: ReactNode;
    /** Controls that act on the whole page, such as Save. */
    actions?: ReactNode;
};

/**
 * The title block every app page opens with, so they all start the same way:
 * the page's name, one line on what it is for, and its page-wide actions
 * opposite. The description is capped so it never runs the width of a wide
 * screen.
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
    return (
        <header className="flex flex-wrap items-end justify-between gap-4">
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
            {actions && (
                <div className="flex shrink-0 items-center gap-3">
                    {actions}
                </div>
            )}
        </header>
    );
}
