{{--
    The payday reminder. Markdown with a few HTML blocks: nothing inside may be
    indented, or the Markdown parser turns it into a code block.
--}}
<x-mail::message>
<p class="eyebrow">Payday check-in</p>

# {{ $count === 1 ? 'A payday is waiting for you' : "{$count} paydays are waiting for you" }}

Hi {{ $name }}, check what actually came in and went out, then finalize {{ $count === 1 ? 'it so the month counts' : 'them so their months count' }} toward your savings. It takes a minute.

<x-mail::payday-list :paydays="$paydays" :total="$total" />

<x-mail::button :url="$reviewUrl">
Review {{ $count === 1 ? 'payday' : 'paydays' }}
</x-mail::button>

<x-mail::panel>
Until a payday is finalized, its month shows as **Nothing settled** on your savings calendar.
</x-mail::panel>

— Kept

<x-slot:subcopy>
Don't want these emails? [Turn off payday reminders]({{ $unsubscribeUrl }}). You can turn them back on in Settings → Notifications.
</x-slot:subcopy>
</x-mail::message>
