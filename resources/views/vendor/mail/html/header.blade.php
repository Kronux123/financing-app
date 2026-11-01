@props(['url'])
{{--
    The app mark, built from table cells rather than an image: mail clients
    block images until asked and most drop SVG outright, so a picture of the
    logo would arrive as a broken box. Three white bars on jade — the short
    15th, the dividing rule, the taller end of the month — as in AppLogoIcon.
--}}
<tr>
<td class="header" align="center">
<a href="{{ $url }}" style="display: inline-block;">
<table cellpadding="0" cellspacing="0" role="presentation" align="center">
<tr>
<td class="brand-mark" valign="bottom">
<table cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td valign="bottom"><div class="brand-bar" style="width: 6px; height: 11px;">&nbsp;</div></td>
<td style="width: 3px;"></td>
<td valign="bottom"><div class="brand-bar" style="width: 2px; height: 20px;">&nbsp;</div></td>
<td style="width: 3px;"></td>
<td valign="bottom"><div class="brand-bar" style="width: 6px; height: 16px;">&nbsp;</div></td>
</tr>
</table>
</td>
<td class="brand-name" valign="middle">{{ $slot }}</td>
</tr>
</table>
</a>
</td>
</tr>
