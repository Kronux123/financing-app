import { cn } from '@/lib/utils';

/**
 * Pixel-art sprites, one per idea the app keeps coming back to.
 *
 * Drawn as SVG squares rather than shipped as images, so they stay sharp at any
 * size, cost nothing to load, and take their colours from the theme — each
 * letter in a sprite is a token, not a hex value, so dark mode recolours them
 * for free.
 *
 * Each idea has one sprite and keeps it everywhere it appears: savings is the
 * piggy bank, the emergency fund is a rainy-day umbrella, debt is a mountain
 * with a flag on the summit, a payday is a money bag. A page header, a
 * dashboard card and an empty state that are about the same thing show the
 * same picture, so the art doubles as a way to recognise where you are.
 *
 * A sprite is a grid of strings — 12 or 16 a side. `.` is empty; every other
 * letter maps to `palette`. Optional `layers` sit on top and carry the idle
 * animation (a coin dropping, rain falling, a flag waving), which stops under
 * reduced motion — see the `pixel-*` utilities in app.css.
 */
const palette: Record<string, string> = {
    o: 'fill-foreground/75',
    j: 'fill-jade',
    a: 'fill-amber',
    /** Amber in shadow, for the side of a coin. */
    A: 'fill-amber/55',
    b: 'fill-goal-close',
    r: 'fill-goal-behind',
    k: 'fill-muted-foreground/60',
    /** Paper and plastic: envelopes, calculator bodies. */
    e: 'fill-muted-foreground/30',
    /** A specular glint. White in both themes — a highlight is light. */
    w: 'fill-white/55',
};

/** The idle motions a layer can carry. Each is a `pixel-*` utility. */
type LayerMotion = 'drop' | 'rain' | 'twinkle' | 'bob' | 'frame-a' | 'frame-b';

type SpriteLayer = {
    rows: string[];
    motion: LayerMotion;
};

type Sprite = {
    rows: string[];
    layers?: SpriteLayer[];
};

const motionClass: Record<LayerMotion, string> = {
    drop: 'pixel-drop',
    rain: 'pixel-rain',
    twinkle: 'pixel-twinkle',
    bob: 'pixel-bob',
    'frame-a': 'pixel-frame-a',
    'frame-b': 'pixel-frame-b',
};

const sprites = {
    piggy: {
        rows: [
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
    },

    /** Savings. A coin drops into the slot, over and over. */
    'piggy-bank': {
        rows: [
            '................',
            '................',
            '................',
            '...........oo...',
            '....ooooooojjo..',
            '...ojjjkkjjjjo..',
            '..ojwwjjjjjjjjo.',
            '.ojwjjjjjjjojjo.',
            '.ojjjjjjjjjjjjoo',
            'oojjjjjjjjjjjjko',
            '.ojjjjjjjjjjjjoo',
            '.ojjjjjjjjjjjjo.',
            '..ojjjjjjjjjjo..',
            '...oojjjjjjoo...',
            '...oo.....oo....',
            '................',
        ],
        layers: [
            {
                motion: 'drop',
                rows: [
                    '.......aa.......',
                    '.......wa.......',
                    '.......aa.......',
                ],
            },
            {
                motion: 'twinkle',
                rows: [
                    '..............a.',
                    '.............aaa',
                    '..............a.',
                ],
            },
        ],
    },

    /** The emergency fund: money for a rainy day, so an umbrella in the rain. */
    umbrella: {
        rows: [
            '................',
            '.......oo.......',
            '.....oojjoo.....',
            '...oojjjjjjoo...',
            '..ojwwjjjjjjjo..',
            '.ojwjjjjjjjjjjo.',
            '.ojjjjjjjjjjjjo.',
            '.oooooooooooooo.',
            '........o.......',
            '........o.......',
            '........o.......',
            '........o.......',
            '........o.......',
            '......o.o.......',
            '.......o........',
            '................',
        ],
        layers: [
            {
                motion: 'rain',
                rows: [
                    '.b............b.',
                    '.b..........b.b.',
                    '............b...',
                    '................',
                    '................',
                    '................',
                    '................',
                    '................',
                    '.b..............',
                    '.b...........b..',
                    '.............b..',
                    '...b............',
                    '...b.......b....',
                    '...........b....',
                ],
            },
        ],
    },

    /** Debt: a climb, with a flag waiting at the top. */
    mountain: {
        rows: [
            '................',
            '........o.......',
            '........o.......',
            '........o.......',
            '.......owo......',
            '......owwwo.....',
            '.....okwkkko....',
            '....okkkkkkko...',
            '...okkkkkkkkko..',
            '..okkkkkkkkkkko.',
            '.okkkkkkkkkkkkko',
            'okkkkkkkkkkkkkko',
            'jjjjjjjjjjjjjjjj',
            'jjjjjjjjjjjjjjjj',
            'oooooooooooooooo',
            '................',
        ],
        layers: [
            {
                motion: 'frame-a',
                rows: [
                    '................',
                    '.........aa.....',
                    '.........aaa....',
                ],
            },
            {
                motion: 'frame-b',
                rows: [
                    '................',
                    '.........aaa....',
                    '.........aa.....',
                ],
            },
        ],
    },

    /** A payday. */
    moneybag: {
        rows: [
            '................',
            '.....o....o.....',
            '......oooo......',
            '.......oo.......',
            '......oaao......',
            '.....oaaaao.....',
            '....oaaaaaao....',
            '...oaaooaaaaao..',
            '..oaaooaoaaaaao.',
            '..oaaaooaaaaaao.',
            '.oaaaaoaaaaaaaao',
            '.oawaaoaaaaaaaao',
            '.oaaaaaaaaaaaaao',
            '..oaaaaaaaaaaao.',
            '...ooooooooooo..',
            '................',
        ],
        layers: [
            {
                motion: 'twinkle',
                rows: [
                    '...a............',
                    '..aaa...........',
                    '...a............',
                ],
            },
        ],
    },

    /** The budget plan: the sums, worked before the money arrives. */
    calculator: {
        rows: [
            '................',
            '..oooooooooooo..',
            '..oeeeeeeeeeeo..',
            '..oejjjjjjjjeo..',
            '..oejjjjjjjjeo..',
            '..oejjjjjjjjeo..',
            '..oeeeeeeeeeeo..',
            '..oekkekkekkeo..',
            '..oeeeeeeeeeeo..',
            '..oekkekkekkeo..',
            '..oeeeeeeeeeeo..',
            '..oekkekkeaaeo..',
            '..oeeeeeeeeeeo..',
            '..oekkekkeaaeo..',
            '..oeeeeeeeeeeo..',
            '..oooooooooooo..',
        ],
        layers: [
            {
                motion: 'twinkle',
                rows: [
                    '................',
                    '................',
                    '................',
                    '................',
                    '.........ww.....',
                ],
            },
        ],
    },

    /** Pay itself: a sealed envelope with the bill peeking out of it. */
    envelope: {
        rows: [
            '................',
            '................',
            '................',
            '................',
            '.oooooooooooooo.',
            '.ooeeeeeeeeeeoo.',
            '.oeoeeeeeeeeoeo.',
            '.oeeoeeeeeeoeeo.',
            '.oeeeoeeeeoeeeo.',
            '.oeeeeoeeoeeeeo.',
            '.oeeeeerreeeeeo.',
            '.oeeeeeeeeeeeeo.',
            '.oeeeeeeeeeeeeo.',
            '.oooooooooooooo.',
            '................',
            '................',
        ],
        layers: [
            {
                motion: 'bob',
                rows: [
                    '....oooooooo....',
                    '....ojjjjjjo....',
                    '....ojjkkjjo....',
                    '....ojjjjjjo....',
                ],
            },
        ],
    },

    /** The best of something: the top month on the savings chart. */
    star: {
        rows: [
            '.....aa.....',
            '.....aa.....',
            '....aaaa....',
            'aaaaaaaaaaaa',
            '.aaaaaaaaaa.',
            '..aaaaaaaa..',
            '...aaaaaa...',
            '...aaaaaa...',
            '..aaa..aaa..',
            '..aa....aa..',
            '.aa......aa.',
            '............',
        ],
        layers: [
            {
                motion: 'twinkle',
                rows: [
                    '............',
                    '............',
                    '.....w......',
                    '....ww......',
                    '...w........',
                ],
            },
        ],
    },

    chart: {
        rows: [
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
    },

    receipt: {
        rows: [
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
        layers: [
            {
                motion: 'twinkle',
                rows: [
                    '............',
                    '............',
                    '............',
                    '............',
                    '............',
                    '............',
                    '............',
                    '............',
                    '.....jjj....',
                ],
            },
        ],
    },

    wallet: {
        rows: [
            '............',
            '............',
            '............',
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
        layers: [
            {
                motion: 'bob',
                rows: ['............', '....aaaa....', '...aaaaaa...'],
            },
        ],
    },

    calendar: {
        rows: [
            '...o....o...',
            '.oooooooooo.',
            '.ojjjjjjjjo.',
            '.oooooooooo.',
            '.o........o.',
            '.o.k.k.k..o.',
            '.o........o.',
            '.o.k.k....o.',
            '.o........o.',
            '.o.k.k.k..o.',
            '.o........o.',
            '.oooooooooo.',
        ],
        layers: [
            {
                motion: 'twinkle',
                rows: [
                    '............',
                    '............',
                    '............',
                    '............',
                    '............',
                    '............',
                    '............',
                    '.......a....',
                ],
            },
        ],
    },
} satisfies Record<string, Sprite>;

export type SpriteName = keyof typeof sprites;

function Cells({ rows }: { rows: string[] }) {
    return rows.flatMap((row, y) =>
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
    );
}

type PixelArtProps = {
    sprite: SpriteName;
    /**
     * Rendered width and height, in pixels. A multiple of the sprite's grid
     * (12 or 16) keeps every cell the same width.
     */
    size?: number;
    className?: string;
};

/** Decoration only — the copy beside a sprite always says what it shows. */
export function PixelArt({ sprite, size = 48, className }: PixelArtProps) {
    const { rows, layers = [] }: Sprite = sprites[sprite];
    const grid = rows.length;

    return (
        <svg
            aria-hidden
            viewBox={`0 0 ${grid} ${grid}`}
            width={size}
            height={size}
            shapeRendering="crispEdges"
            className={cn('shrink-0 overflow-visible', className)}
        >
            <Cells rows={rows} />
            {layers.map((layer) => (
                <g key={layer.motion} className={motionClass[layer.motion]}>
                    <Cells rows={layer.rows} />
                </g>
            ))}
        </svg>
    );
}

type SpriteTileProps = {
    sprite: SpriteName;
    className?: string;
};

/**
 * A sprite on a small raised tile, for the head of a page. 48px is a whole
 * number of pixels per cell for both the 12 and the 16 grid.
 */
export function SpriteTile({ sprite, className }: SpriteTileProps) {
    return (
        <span
            className={cn(
                'flex size-16 shrink-0 items-center justify-center rounded-xl border border-border bg-card shadow-sm',
                className,
            )}
        >
            <PixelArt sprite={sprite} size={48} />
        </span>
    );
}
