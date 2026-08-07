<?php

namespace App\Enums;

enum PayoutStatus: string
{
    case Pending = 'pending';
    case Finalized = 'finalized';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Finalized => 'Finalized',
        };
    }

    /**
     * A finalized payday is the record of what happened, so it stops following
     * the plan and stops accepting edits until it is reopened.
     */
    public function isEditable(): bool
    {
        return $this === self::Pending;
    }
}
