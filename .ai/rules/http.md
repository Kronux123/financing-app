---
paths:
  - 'app/Http/**'
---

# Http

## Money is centavos in the database and pesos on the wire
Every amount column stores centavos. Every amount the pages send or read is pesos. The crossing belongs in exactly two places per feature: the Resource on the way out and the FormRequest on the way in, both using the ConvertsMoney trait (app/Concerns/ConvertsMoney.php).

Never convert anywhere else, and never let a raw model reach Inertia — a missing conversion is a hundredfold error in somebody's budget. Validation rules for an amount are ['numeric', 'min:0', 'max:9999999999'], because pesos may carry centavos.
