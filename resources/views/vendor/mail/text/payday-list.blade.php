@props(['paydays', 'total'])
@foreach ($paydays as $payday)
- {{ $payday['date'] }} · {{ $payday['label'] }} · {{ $payday['amount'] }} planned
@endforeach

Total planned: {{ $total }}
