<?php

namespace App\Http\Requests\Payouts;

use App\Enums\PayoutStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PayoutStatusUpdateRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(PayoutStatus::class)],
        ];
    }

    public function status(): PayoutStatus
    {
        return PayoutStatus::from($this->validated('status'));
    }
}
