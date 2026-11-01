<x-mail::layout>
{{-- Header --}}
<x-slot:header>
<x-mail::header :url="config('app.url')">
{{ config('app.name') }}
</x-mail::header>
</x-slot:header>

{{-- Body --}}
{!! $slot !!}

{{-- Subcopy --}}
@isset($subcopy)
<x-slot:subcopy>
<x-mail::subcopy>
{!! $subcopy !!}
</x-mail::subcopy>
</x-slot:subcopy>
@endisset

{{-- Footer --}}
<x-slot:footer>
<x-mail::footer>
{{ config('app.name') }} · Plan every peso of every payday.  
You're getting this because you have a {{ config('app.name') }} account at [{{ preg_replace('#^https?://#', '', config('app.url')) }}]({{ config('app.url') }}).
</x-mail::footer>
</x-slot:footer>
</x-mail::layout>
