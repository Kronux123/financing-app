import { cn } from '@/lib/utils';

/**
 * Small sprites for the app's empty and first-run moments.
 *
 * Drawn as SVG squares rather than shipped as images, so they stay sharp at any
 * size, cost nothing to load, and take their colours from the theme — each
 * letter in a sprite is a token, not a hex value, so dark mode recolours them
 * for free. Used sparingly on purpose: the rest of the app speaks in line
 * icons, and these are for the places where the page is waiting on you.
 *
 * Each sprite is 12 rows of 12. `.` is empty; the rest map to `palette`.
 */
const palette: Record<string, string> = {
    o: 'fill-foreground/75',
    j: 'fill-jade',
    a: 'fill-amber',
    k: 'fill-muted-foreground/60',
};

const sprites = {
    piggy: [
        '....aa......',
        '....aa......',
        '........o...',
        '..ooooooo...',
        '.ojjjjjjjo..',
        'ojjjjjjjojo.',
        'ojjjjjjjjjoo',
        'ojjjjjjjjjoo',
        '.ojjjjjjjo..',
        '..ojjjjjo...',
        '..oo..oo....',
        '............',
    ],
    chart: [
        '............',
        '.........jj.',
        '.........jj.',
        '......jj.jj.',
        '......jj.jj.',
        '...jj.jj.jj.',
        '...jj.jj.jj.',
        'jj.jj.jj.jj.',
        'jj.jj.jj.jj.',
        'jj.jj.jj.jj.',
        'oooooooooooo',
        '............',
    ],
    receipt: [
        '..oooooooo..',
        '..o......o..',
        '..o.kkkk.o..',
        '..o......o..',
        '..o.kkk..o..',
        '..o......o..',
        '..o.kk...o..',
        '..o......o..',
        '..o..jjj.o..',
        '..o......o..',
        '..o.o.o.oo..',
        '..oo.o.o.o..',
    ],
    wallet: [
        '............',
        '....aaaa....',
        '...aaaaaa...',
        '.oooooooooo.',
        '.ojjjjjjjjo.',
        '.ojjjjjjjjo.',
        '.ojjjjjoooo.',
        '.ojjjjjo.ao.',
        '.ojjjjjoooo.',
        '.ojjjjjjjjo.',
        '.oooooooooo.',
        '............',
    ],
    calendar: [
        '...o....o...',
        '.oooooooooo.',
        '.ojjjjjjjjo.',
        '.oooooooooo.',
        '.o........o.',
        '.o.k.k.k..o.',
        '.o........o.',
        '.o.k.k.a..o.',
        '.o........o.',
        '.o.k.k.k..o.',
        '.o........o.',
        '.oooooooooo.',
    ],
} satisfies Record<string, string[]>;

export type SpriteName = keyof typeof sprites;

type PixelArtProps = {
    sprite: SpriteName;
    /** Rendered width and height, in pixels. Multiples of 12 stay crispest. */
    size?: number;
    className?: string;
};

/** Decoration only — the copy beside a sprite always says what it shows. */
export function PixelArt({ sprite, size = 48, className }: PixelArtProps) {
    const rows = sprites[sprite];

    return (
        <svg
            aria-hidden
            viewBox="0 0 12 12"
            width={size}
            height={size}
            shapeRendering="crispEdges"
            className={cn('shrink-0', className)}
        >
            {rows.flatMap((row, y) =>
                [...row].map((cell, x) =>
                    cell === '.' ? null : (
                        <rect
                            key={`${x}-${y}`}
                            x={x}
                            y={y}
                            width={1}
                            height={1}
                            className={palette[cell]}
                        />
                    ),
                ),
            )}
        </svg>
    );
}
