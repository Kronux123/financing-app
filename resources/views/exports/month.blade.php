{{--
    One month's breakdown, printed.

    Rendered by headless Chromium rather than a php pdf library, so this is
    ordinary css — grid, flexbox and all — and needs no print-only dialect. It is
    deliberately self-contained: the app's stylesheet is built for a screen with a
    sidebar, and @vite assets are served over http, which a page rendered from a
    string cannot reach.

    Every figure arrives as pesos from MonthBreakdownResource, already grouped and
    subtotalled, and the proportion bar arrives as shares from MonthBreakdown.
    Nothing is worked out here beyond formatting — a sum computed in a template is
    a sum no test can see.
--}}
@php
    $peso = fn (float|int $amount): string => '₱'.number_format(abs($amount));
    $signed = fn (float|int $amount): string => ($amount < 0 ? '−' : '+').$peso($amount);
    /** Nothing to say about a bill that came in at its forecast. */
    $variance = fn (float|int $amount): string => $amount == 0 ? '—' : $signed($amount);
@endphp
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $month['label'] }} breakdown</title>
    <style>
        /*
         * Two families, both of which a container actually has: Liberation or
         * DejaVu. A missing font is what turns every ₱ in the document into a
         * hollow box.
         */
        :root {
            --ink: #171717;
            --ink-2: #525252;
            --muted: #8a8a8a;
            --rule: #e7e7e5;
            --rule-strong: #171717;
            --paper: #ffffff;

            /*
             * The three hues the savings calendar already uses, validated for
             * colour-blind separation together (see --goal-* in app.css, and the
             * note on the tiers in savings-calendar.tsx). They are reused rather
             * than re-picked because every alternative trio failed the same
             * check, and here they carry categories rather than status: the
             * segments are labelled and totalled underneath, so nothing in this
             * document is told by colour alone.
             */
            --payables: #2a78d6;
            --allowance: #eb6834;
            --saved: #1baf7a;
            --over: #be123c;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            background: var(--paper);
            color: var(--ink);
            font-family: 'Liberation Sans', 'DejaVu Sans', Arial, Helvetica, sans-serif;
            font-size: 9.5pt;
            line-height: 1.45;
            -webkit-font-smoothing: antialiased;
        }

        h1, h2, h3 {
            margin: 0;
            font-weight: 600;
        }

        /* ── Masthead ───────────────────────────────────────────────── */

        .masthead {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 24px;
        }

        .wordmark {
            display: flex;
            align-items: center;
            gap: 7px;
            font-size: 8.5pt;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
        }

        /* The app's mark, drawn rather than fetched — see the favicon. */
        .wordmark span {
            width: 9px;
            height: 9px;
            border-radius: 2.5px;
            background: var(--saved);
        }

        h1 {
            margin-top: 3px;
            font-size: 23pt;
            letter-spacing: -0.02em;
            line-height: 1.1;
        }

        .kicker {
            font-size: 8pt;
            font-weight: 600;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: var(--muted);
        }

        .who {
            text-align: right;
            font-size: 8.5pt;
            color: var(--ink-2);
        }

        .who strong {
            display: block;
            font-size: 9.5pt;
        }

        .who span {
            color: var(--muted);
        }

        /* ── The three figures ──────────────────────────────────────── */

        .figures {
            display: flex;
            gap: 0;
            margin: 20px 0 0;
            padding: 14px 0;
            border-top: 1.5px solid var(--rule-strong);
            border-bottom: 1px solid var(--rule);
        }

        .figures div {
            flex: 1;
            padding-left: 16px;
            border-left: 1px solid var(--rule);
        }

        .figures div:first-child {
            padding-left: 0;
            border-left: 0;
        }

        .figures dt {
            font-size: 7.5pt;
            font-weight: 600;
            letter-spacing: 0.09em;
            text-transform: uppercase;
            color: var(--muted);
        }

        /*
         * Proportional figures, not tabular: at this size equal-width digits make
         * a number like 121 read loose. Tabular is for the columns below, where
         * the point is that they line up.
         */
        .figures dd {
            margin: 3px 0 0;
            font-size: 17pt;
            font-weight: 600;
            letter-spacing: -0.015em;
        }

        .figures .lead dd {
            color: var(--saved);
        }

        .figures .lead.negative dd {
            color: var(--over);
        }

        /* ── Where it went ──────────────────────────────────────────── */

        .allocation {
            margin-top: 18px;
        }

        /*
         * A 2px gap in the paper colour separates the segments — the white is the
         * separator, never a stroke drawn round each block. Square where they meet,
         * rounded at the two outer ends only, so the bar reads as one quantity.
         */
        .bar {
            display: flex;
            gap: 2px;
            height: 13px;
            margin-top: 7px;
        }

        .bar i {
            display: block;
            height: 100%;
            background: var(--tone);
        }

        .bar i:first-child {
            border-radius: 4px 0 0 4px;
        }

        .bar i:last-child {
            border-radius: 0 4px 4px 0;
        }

        .keys {
            display: flex;
            gap: 20px;
            margin: 8px 0 0;
            padding: 0;
            list-style: none;
            font-size: 8.5pt;
        }

        .keys li {
            display: flex;
            align-items: baseline;
            gap: 6px;
            color: var(--ink-2);
        }

        .keys b {
            color: var(--ink);
            font-variant-numeric: tabular-nums;
        }

        .keys em {
            color: var(--muted);
            font-style: normal;
        }

        .swatch {
            width: 8px;
            height: 8px;
            border-radius: 2px;
            background: var(--tone);
        }

        .overspent {
            margin: 8px 0 0;
            font-size: 8.5pt;
            font-weight: 600;
            color: var(--over);
        }

        /* ── A payday ───────────────────────────────────────────────── */

        /*
         * A payday is one unit of meaning, so it is not split down the middle by a
         * page break when there is room for it overleaf.
         */
        .payday {
            margin-top: 22px;
            break-inside: avoid;
        }

        .payday header {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 16px;
            padding-bottom: 5px;
            border-bottom: 1.5px solid var(--rule-strong);
        }

        .payday h2 {
            font-size: 11pt;
            letter-spacing: -0.01em;
        }

        .payday h2 span {
            margin-left: 8px;
            font-size: 8.5pt;
            font-weight: 400;
            color: var(--muted);
        }

        .payday .settled {
            font-size: 8.5pt;
            color: var(--ink-2);
            font-variant-numeric: tabular-nums;
        }

        .payday .settled b {
            color: var(--ink);
        }

        table {
            width: 100%;
            margin: 0;
            border-collapse: collapse;
            font-variant-numeric: tabular-nums;
        }

        thead th {
            padding: 7px 7px 5px;
            font-size: 7pt;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            text-align: right;
            color: var(--muted);
        }

        td {
            padding: 4.5px 7px;
            text-align: right;
            border-bottom: 1px solid var(--rule);
        }

        th:first-child, td:first-child {
            padding-left: 0;
            text-align: left;
            font-variant-numeric: normal;
        }

        th:last-child, td:last-child {
            padding-right: 0;
        }

        /*
         * A group leads its own rows and carries their total, rather than closing
         * them with a subtotal underneath. Leading is what stops the label reading
         * as a repeat when a group holds a single line called the same thing —
         * "Allowance / Allowance" was the shape that gave that away — and it means
         * the group name is always on the page, not only where a subtotal earned
         * its place.
         */
        tr.group td {
            padding-top: 10px;
            font-weight: 600;
            border-bottom: 0;
            border-top: 1px solid var(--rule-strong);
        }

        tr.group td:first-child {
            font-size: 7.5pt;
            letter-spacing: 0.07em;
            text-transform: uppercase;
        }

        tr.group + tr td {
            padding-top: 7px;
        }

        /* The lines sit under their group, so they are nested beneath it. */
        tbody tr:not(.group) td:first-child {
            padding-left: 11px;
        }

        .section {
            margin-top: 12px;
            font-size: 7pt;
            font-weight: 600;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: var(--muted);
        }

        .tag {
            display: inline-block;
            margin-left: 6px;
            padding: 0 4px;
            font-size: 6.5pt;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: var(--over);
            border: 1px solid currentColor;
            border-radius: 3px;
            vertical-align: 1px;
        }

        .up {
            color: var(--saved);
        }

        .down {
            color: var(--over);
        }

        .note {
            margin-top: 24px;
            padding-top: 9px;
            font-size: 7.5pt;
            line-height: 1.5;
            color: var(--muted);
            border-top: 1px solid var(--rule);
        }
    </style>
</head>
<body>
<header class="masthead">
    <div>
        <p class="wordmark"><span></span>{{ config('app.name') }}</p>
        <h1>{{ $month['label'] }}</h1>
        <p class="kicker">Savings breakdown</p>
    </div>
    <div class="who">
        <strong>{{ $user->name }}</strong>
        <span>Generated {{ $generatedOn }}</span>
    </div>
</header>

<dl class="figures">
    <div>
        <dt>Income received</dt>
        <dd>{{ $peso($month['income']) }}</dd>
    </div>
    <div>
        <dt>Total spending</dt>
        <dd>{{ $peso($month['spend']) }}</dd>
    </div>
    {{--
        Saved is income less payables and allowance, so it is not the difference
        between the two figures beside it — money put by is inside the spending.
    --}}
    <div class="lead {{ $month['overspent'] ? 'negative' : '' }}">
        <dt>{{ $month['overspent'] ? 'Overspent by' : 'Saved' }}</dt>
        <dd>{{ $peso($month['saved']) }}</dd>
    </div>
</dl>

<section class="allocation">
    <p class="kicker">Where the {{ $peso($month['income']) }} went</p>

    <div class="bar">
        @foreach ($month['allocation'] as $part)
            <i style="--tone: var(--{{ $part['key'] }}); width: {{ round($part['share'] * 100, 2) }}%"></i>
        @endforeach
    </div>

    {{--
        The key is the legend and the table of the bar at once: swatch, name, share
        and amount. Nothing is left to colour-matching, and no label is set inside a
        segment where a narrow month would clip it.
    --}}
    <ul class="keys">
        @foreach ($month['allocation'] as $part)
            <li>
                <span class="swatch" style="--tone: var(--{{ $part['key'] }})"></span>
                {{ $part['label'] }}
                <b>{{ $part['percent'] }}%</b>
                <em>{{ $peso($part['amount']) }}</em>
            </li>
        @endforeach
    </ul>

    @if ($month['overspent'])
        <p class="overspent">
            More went out than came in this month, so the bar shows what the
            outgoings were split into rather than a whole month's income.
        </p>
    @endif
</section>

@foreach ($month['paydays'] as $payday)
    <section class="payday">
        <header>
            <h2>
                {{ $payday['label'] }}
                <span>paid {{ \Illuminate\Support\Carbon::parse($payday['paidOn'])->isoFormat('D MMMM YYYY') }}</span>
            </h2>
            <p class="settled">
                {{ $peso($payday['income']) }} in · {{ $peso($payday['spend']) }} out ·
                <b>{{ $signed($payday['leftOver']) }} left</b>
            </p>
        </header>

        <p class="section">Money in</p>
        <table>
            <thead>
            <tr>
                <th>Source</th>
                <th>Planned</th>
                <th>Actual</th>
                <th>Variance</th>
            </tr>
            </thead>
            <tbody>
            @foreach ($payday['incomes'] as $income)
                <tr>
                    <td>{{ $income['label'] }} <span class="kicker">{{ $income['source'] }}</span></td>
                    <td>{{ $peso($income['planned']) }}</td>
                    <td>{{ $peso($income['actual']) }}</td>
                    {{-- Over the forecast is the good direction on money in. --}}
                    <td class="{{ $income['variance'] > 0 ? 'up' : ($income['variance'] < 0 ? 'down' : '') }}">
                        {{ $variance($income['variance']) }}
                    </td>
                </tr>
            @endforeach
            {{--
                Only worth a total when there was more than one thing to add up.
                A payday with nothing but its paycheck would otherwise print the
                same figure twice in a row.
            --}}
            @if (count($payday['incomes']) > 1)
                <tr class="group">
                    <td>Received</td>
                    <td></td>
                    <td>{{ $peso($payday['income']) }}</td>
                    <td></td>
                </tr>
            @endif
            </tbody>
        </table>

        @if (count($payday['spending']) > 0)
            <p class="section">Money out</p>
            <table>
                <thead>
                <tr>
                    <th>Item</th>
                    <th>Planned</th>
                    <th>Actual</th>
                    <th>Variance</th>
                </tr>
                </thead>
                <tbody>
                @foreach ($payday['spending'] as $group)
                    <tr class="group">
                        <td>{{ $group['group'] }}</td>
                        <td></td>
                        <td>{{ $peso($group['total']) }}</td>
                        <td></td>
                    </tr>
                    @foreach ($group['lines'] as $line)
                        <tr>
                            <td>
                                {{ $line['name'] }}
                                @if ($line['unplanned'])
                                    <span class="tag">Unplanned</span>
                                @endif
                            </td>
                            <td>{{ $peso($line['planned']) }}</td>
                            <td>{{ $peso($line['actual']) }}</td>
                            {{-- And the bad one on money out, which is the opposite. --}}
                            <td class="{{ $line['variance'] > 0 ? 'down' : ($line['variance'] < 0 ? 'up' : '') }}">
                                {{ $variance($line['variance']) }}
                            </td>
                        </tr>
                    @endforeach
                @endforeach
                </tbody>
            </table>
        @endif
    </section>
@endforeach

<p class="note">
    Settled paydays only — a payday still pending carries the figures the plan gave
    it when it opened, so it is not history yet and is absent here. Saved is income
    less payables and allowance, which is why money put by is counted inside it
    rather than beside it. Variance is measured against the plan as it stood when
    each payday opened, not as it stands now.
</p>
</body>
</html>
