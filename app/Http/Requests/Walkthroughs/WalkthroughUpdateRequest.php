<?php

namespace App\Http\Requests\Walkthroughs;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class WalkthroughUpdateRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'outcome' => ['required', 'in:completed,dismissed'],
        ];
    }

    public function wasCompleted(): bool
    {
        return $this->validated('outcome') === 'completed';
    }
}
