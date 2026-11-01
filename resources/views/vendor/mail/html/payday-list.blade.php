@props(['paydays', 'total'])
{{--
    The paydays in a payday reminder: a calendar badge, the paycheck and the
    date, the planned amount on the right, and the total under them all.
    Tables and inline sizes, because that is what every mail client agrees on.
    No indentation: this lands inside Markdown.
--}}
<table class="payday-list" width="100%" cellpadding="0" cellspacing="0" role="presentation">
@foreach ($paydays as $payday)
<tr>
<td class="payday-cell" width="64" valign="middle">
<table class="payday-badge" cellpadding="0" cellspacing="0" role="presentation">
<tr><td class="payday-badge-month" align="center">{{ $payday['month'] }}</td></tr>
<tr><td class="payday-badge-day" align="center">{{ $payday['day'] }}</td></tr>
</table>
</td>
<td class="payday-cell" valign="middle">
<span class="payday-label">{{ $payday['label'] }}</span><br>
<span class="payday-sub">{{ $payday['date'] }}</span>
</td>
<td class="payday-cell" align="right" valign="middle">
<span class="payday-amount">{{ $payday['amount'] }}</span><br>
<span class="payday-sub">planned</span>
</td>
</tr>
@endforeach
<tr>
<td class="payday-total-cell" colspan="2">Total planned</td>
<td class="payday-total-cell payday-total" align="right">{{ $total }}</td>
</tr>
</table>
