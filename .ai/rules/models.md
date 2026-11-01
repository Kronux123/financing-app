---
paths:
  - 'app/Models/**'
---

# Models

## PHPStan needs parseModelCastsMethod to read casts()
Models declare casts via the `casts(): array` method with a `@return array<string, string>` docblock. Larastan defaults `parseModelCastsMethod: false`, which makes it read that *declared* return type instead of the method body. `array<string, string>` is not a constant array, so every cast is dropped and date/enum attributes are typed as plain `string` — producing bogus "Cannot call method format() on string" / "Cannot access property $value on string" errors at each use site.

phpstan.neon sets `parseModelCastsMethod: true` so the return array is parsed from the AST. Do not "fix" that error family by loosening the model code, widening the docblock, or adding ignores — check that flag first. Removing the docblock does not help: without it the return type is just `array`, still not constant.

## Mirror column defaults in $attributes
A database default (like users.payday_reminders = true) is not on a model until it is reloaded. A user fresh from create() has no such attribute, so it reads as null/false. Browser tests use that same in-memory model for actingAs, so the settings page rendered reminders as off and the toggle saved the opposite of what was clicked. Any new column with a default the app reads must also be set in the model's $attributes.
