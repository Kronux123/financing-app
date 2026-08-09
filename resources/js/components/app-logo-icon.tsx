import type { SVGAttributes } from 'react';

/**
 * The app mark: two paychecks either side of the rule that divides them.
 *
 * It is the plan page reduced to three shapes — a short bar for the 15th, which
 * carries the rent and comes out tight, a taller one for the end of the month,
 * and the full-height divider that runs down the middle of every semi-monthly
 * plan in this app. The same split the landing page opens with.
 *
 * Drawn as three rounded bars on a shared baseline so it survives being set at
 * 16px in a browser tab. No fill is declared: every caller sets `fill-current`
 * and colours it with text utilities.
 */
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <rect x="3.5" y="11" width="5" height="9.5" rx="1.6" />
            <rect x="11.1" y="3.5" width="1.8" height="17" rx="0.9" />
            <rect x="15.5" y="6.5" width="5" height="14" rx="1.6" />
        </svg>
    );
}
