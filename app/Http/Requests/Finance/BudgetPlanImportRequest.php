<?php

namespace App\Http\Requests\Finance;

use App\Http\Resources\BudgetPlanFileResource;
use Closure;
use Illuminate\Http\UploadedFile;

/**
 * A plan file, checked exactly as the Save button's plan is checked.
 *
 * The file's plan is unpacked into the request and then handed to the rules and
 * conversion the editor already uses, so an import cannot get past anything a
 * save would not. Two things happen on the way: the grouped rows are flattened
 * into the shape the page sends, and every row id is dropped — an id from
 * another database could otherwise match a row of yours and overwrite it.
 */
class BudgetPlanImportRequest extends BudgetPlanUpdateRequest
{
    /**
     * One bad field is enough to say the file will not do. Reporting every
     * field of an unreadable file would only say the same thing many times.
     *
     * @var bool
     */
    protected $stopOnFirstFailure = true;

    private bool $isPlanFile = false;

    protected function prepareForValidation(): void
    {
        $plan = $this->planInFile();

        if ($plan !== null) {
            $this->isPlanFile = true;
            $this->merge($this->unpack($plan));
        }

        parent::prepareForValidation();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // Checked first, so a stray file is refused before any plan field.
            'file' => [
                'required',
                'file',
                'max:512',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (! $this->isPlanFile) {
                        $fail('This is not a budget plan exported from Kept.');
                    }
                },
            ],
            ...parent::rules(),
        ];
    }

    /**
     * The plan the file carries, or null for anything that is not one of ours.
     *
     * @return array<string, mixed>|null
     */
    private function planInFile(): ?array
    {
        $file = $this->file('file');

        if (! $file instanceof UploadedFile || ! $file->isValid()) {
            return null;
        }

        $contents = json_decode((string) $file->get(), true);

        if (
            ! is_array($contents)
            || ($contents['app'] ?? null) !== BudgetPlanFileResource::APP
            || ($contents['version'] ?? null) !== BudgetPlanFileResource::VERSION
            || ! is_array($contents['plan'] ?? null)
        ) {
            return null;
        }

        return $contents['plan'];
    }

    /**
     * The file's plan in the shape the page sends.
     *
     * Rows that are not arrays are dropped rather than passed on, because the
     * parent's normalising expects arrays and a hand-edited file is not bound
     * by the page's types.
     *
     * @param  array<string, mixed>  $plan
     * @return array<string, mixed>
     */
    private function unpack(array $plan): array
    {
        $items = [];

        foreach ($this->arrays($plan['groups'] ?? []) as $group) {
            foreach ($this->arrays($group['items'] ?? []) as $item) {
                $items[] = [...$item, 'id' => null, 'group' => $group['id'] ?? null];
            }
        }

        return [
            'cadence' => $plan['cadence'] ?? null,
            'grossMonthly' => $plan['grossMonthly'] ?? null,
            'emergencyFund' => $plan['emergencyFund'] ?? null,
            'savingsPot' => $plan['savingsPot'] ?? null,
            'paychecks' => $this->arrays($plan['paychecks'] ?? []),
            'items' => $items,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function arrays(mixed $list): array
    {
        return is_array($list) ? array_values(array_filter($list, is_array(...))) : [];
    }
}
