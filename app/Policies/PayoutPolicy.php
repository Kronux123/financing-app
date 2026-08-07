<?php

namespace App\Policies;

use App\Models\Payout;
use App\Models\User;

/**
 * A payout belongs to exactly one person and is never shared.
 *
 * Everything here comes down to the same ownership check. It is written out
 * rather than left to scoping, because the moment a route takes a {payout}
 * parameter, implicit binding will happily hand over somebody else's row.
 */
class PayoutPolicy
{
    public function view(User $user, Payout $payout): bool
    {
        return $payout->user_id === $user->id;
    }

    public function update(User $user, Payout $payout): bool
    {
        return $payout->user_id === $user->id;
    }

    public function delete(User $user, Payout $payout): bool
    {
        return $payout->user_id === $user->id;
    }
}
