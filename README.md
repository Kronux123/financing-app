<div align="center">
  <img src="public/favicon.svg" width="88" height="88" alt="Kept">

  <h1>Kept</h1>

  <p><strong>Plan what comes in. Record what goes out.</strong></p>

  <p>
    A personal finance planner for people paid once or twice a month.<br>
    Give every peso a job before payday, then see what you actually saved.
  </p>

  <p>
    <a href="https://github.com/Kronux123/financing-app/actions/workflows/tests.yml"><img src="https://github.com/Kronux123/financing-app/actions/workflows/tests.yml/badge.svg" alt="tests"></a>
    <a href="https://github.com/Kronux123/financing-app/actions/workflows/lint.yml"><img src="https://github.com/Kronux123/financing-app/actions/workflows/lint.yml/badge.svg" alt="linter"></a>
  </p>

  <p>
    <a href="#features">Features</a>
    &nbsp;·&nbsp;
    <a href="#how-it-works">How it works</a>
    &nbsp;·&nbsp;
    <a href="#a-closer-look">Screenshots</a>
    &nbsp;·&nbsp;
    <a href="#built-with">Built with</a>
  </p>
</div>

<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/readme/dashboard-dark.png">
  <img alt="The Kept dashboard: where this month's pay goes, total saved, the emergency fund, outstanding debt and recent activity" src=".github/readme/dashboard-light.png">
</picture>

<br>

## Features

<table>
  <tr>
    <td width="33%" valign="top">
      <h3>Give every peso a job</h3>
      Split each paycheck into payables, allowance and savings. Enter your gross
      and SSS, PhilHealth, Pag-IBIG and tax are worked out for you.
    </td>
    <td width="33%" valign="top">
      <h3>Check each payday</h3>
      Paydays open by themselves, filled in from your plan. Fix what came out
      different, then finalize.
    </td>
    <td width="33%" valign="top">
      <h3>See every month</h3>
      A savings calendar graded against your goal, with any month as a
      spreadsheet or a PDF.
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <h3>Watch debt go down</h3>
      What is left on each debt, how far through you are, and when you will be
      free of it.
    </td>
    <td width="33%" valign="top">
      <h3>Every peso in and out</h3>
      One log of each payday's income and spending, with anything unplanned
      tagged.
    </td>
    <td width="33%" valign="top">
      <h3>A tour of every page</h3>
      Short walkthroughs, shown over sample data when you are just starting
      out.
    </td>
  </tr>
</table>

Also: payday reminders by email, two-factor authentication and passkeys, and
light and dark themes.

## How it works

<table>
  <tr>
    <td width="33%" valign="top" align="center">
      <h3>1 · Plan</h3>
      Say what each paycheck is for, before it arrives.
    </td>
    <td width="33%" valign="top" align="center">
      <h3>2 · Review</h3>
      Each payday opens from the plan. Correct it and finalize.
    </td>
    <td width="33%" valign="top" align="center">
      <h3>3 · Look back</h3>
      Finalized paydays become your history, month by month.
    </td>
  </tr>
</table>

Each payday keeps its own copy of the plan, so changing your plan later never
rewrites a month that already happened.

## A closer look

<table>
  <tr>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset=".github/readme/plan-dark.png">
        <img alt="The budget plan, with a paycheck on the 15th and one at the end of the month, each split into payables, allowance and savings" src=".github/readme/plan-light.png">
      </picture>
      <p align="center"><strong>Budget plan</strong><br><sub>Two paychecks, each with its own jobs</sub></p>
    </td>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset=".github/readme/payouts-dark.png">
        <img alt="A payday: each planned line with what actually went out, and what is left" src=".github/readme/payouts-light.png">
      </picture>
      <p align="center"><strong>Paydays</strong><br><sub>What the plan said, next to what happened</sub></p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset=".github/readme/calendar-dark.png">
        <img alt="The savings calendar: the year's total against its goal, the best and lowest months, and each month graded against the monthly goal" src=".github/readme/calendar-light.png">
      </picture>
      <p align="center"><strong>Savings calendar</strong><br><sub>The whole year, graded against your goal</sub></p>
    </td>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset=".github/readme/debt-dark.png">
        <img alt="The debt page: the total owed, when it will be paid off, and the balance left on each debt" src=".github/readme/debt-light.png">
      </picture>
      <p align="center"><strong>Debt</strong><br><sub>What is left, and when it will be gone</sub></p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset=".github/readme/activities-dark.png">
        <img alt="The activity log: each payday's income and spending, with its category and status" src=".github/readme/activities-light.png">
      </picture>
      <p align="center"><strong>Activity log</strong><br><sub>Every peso in and out, newest first</sub></p>
    </td>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset=".github/readme/walkthrough-dark.png">
        <img alt="The dashboard walkthrough spotlighting where this month's pay goes" src=".github/readme/walkthrough-light.png">
      </picture>
      <p align="center"><strong>Walkthroughs</strong><br><sub>A guided tour the first time you open a page</sub></p>
    </td>
  </tr>
</table>

<p align="center"><sub>Click any screenshot to see it full size.</sub></p>

## Built with

<p>
  <img src="https://img.shields.io/badge/Laravel_13-FF2D20?style=for-the-badge&logo=laravel&logoColor=white" alt="Laravel 13">
  <img src="https://img.shields.io/badge/PHP-777BB4?style=for-the-badge&logo=php&logoColor=white" alt="PHP">
  <img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19">
  <img src="https://img.shields.io/badge/Inertia_3-9553E9?style=for-the-badge&logo=inertia&logoColor=white" alt="Inertia 3">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4">
  <img src="https://img.shields.io/badge/PostgreSQL_17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL 17">
</p>

<p>
  <img src="https://img.shields.io/badge/Pest-F28D1A?style=for-the-badge&logoColor=white" alt="Pest">
  <img src="https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logoColor=white" alt="Playwright">
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" alt="GitHub Actions">
  <img src="https://img.shields.io/badge/Laravel_Herd-FF2D20?style=for-the-badge&logo=laravel&logoColor=white" alt="Laravel Herd">
</p>

Sign-in is handled by Laravel Fortify, spreadsheets by PhpSpreadsheet, and PDFs
by headless Chromium. Local email goes to Mailpit.

## License

MIT.
