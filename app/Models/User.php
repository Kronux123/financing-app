<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
/**
 * MustVerifyEmail, because payday reminders only go to verified addresses: a
 * typo at sign-up is somebody else's inbox. Verifying is what makes an account
 * reachable at all.
 */
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * The column defaults, mirrored so a user that has just been created reads
     * the same as one loaded back from the database. Without it a fresh model
     * has no `payday_reminders` at all, which reads as off.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'payday_reminders' => true,
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'payday_reminders' => 'boolean',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    /**
     * @return HasOne<BudgetPlan, $this>
     */
    public function budgetPlan(): HasOne
    {
        return $this->hasOne(BudgetPlan::class);
    }

    /**
     * The ledger. Hangs off the user rather than the plan, so it survives the
     * plan being rebuilt.
     *
     * @return HasMany<Payout, $this>
     */
    public function payouts(): HasMany
    {
        return $this->hasMany(Payout::class)->orderByDesc('paid_on');
    }
}
