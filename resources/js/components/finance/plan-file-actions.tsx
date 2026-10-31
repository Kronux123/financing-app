import { Form } from '@inertiajs/react';
import { Download, Upload } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    exportMethod as exportRoute,
    importMethod as importRoute,
} from '@/routes/finance';

/**
 * The plan file, fetched before it is saved — or null once signed out.
 *
 * Not a plain download link. A link hands the response straight to the
 * browser, so a session that has ended (signed out, or switched account in
 * another tab) is answered with the login page, which the browser then saves
 * as `login.htm` without a word. Asking for JSON makes Laravel answer that case
 * with a 401 instead, which can be said out loud.
 */
const fetchPlanFile = async (): Promise<{
    blob: Blob;
    name: string;
} | null> => {
    const response = await fetch(exportRoute().url, {
        headers: { Accept: 'application/json' },
    });

    if (response.status === 401 || response.status === 419) {
        return null;
    }

    if (!response.ok) {
        throw new Error(`Export failed with ${response.status}`);
    }

    const name =
        /filename="([^"]+)"/.exec(
            response.headers.get('Content-Disposition') ?? '',
        )?.[1] ?? 'kept-budget-plan.json';

    return { blob: await response.blob(), name };
};

const saveFile = (blob: Blob, name: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
};

type PlanFileActionsProps = {
    /** Whether a plan has been saved yet. There is nothing to export before. */
    hasSavedPlan: boolean;
    /** Called once an import lands, so the page takes the imported plan. */
    onImported: () => void;
};

/**
 * Taking the plan away as a file, and bringing one back.
 *
 * The export is the saved plan, not the draft. The import replaces the whole
 * plan, unsaved edits included, which is why it asks first rather than acting
 * on the file as soon as one is picked.
 */
export function PlanFileActions({
    hasSavedPlan,
    onImported,
}: PlanFileActionsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);

        try {
            const file = await fetchPlanFile();

            if (file === null) {
                toast.error(
                    'Your session has ended. Sign in again, then export.',
                );

                return;
            }

            saveFile(file.blob, file.name);
        } catch {
            toast.error('The plan could not be exported. Try again.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            {hasSavedPlan && (
                <Button
                    variant="outline"
                    disabled={isExporting}
                    onClick={handleExport}
                    data-test="export-plan"
                >
                    <Download aria-hidden />
                    Export
                </Button>
            )}

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" data-test="import-plan">
                        <Upload aria-hidden />
                        Import
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogTitle>Import a budget plan</DialogTitle>
                    <DialogDescription>
                        Choose a file exported from Kept. It replaces your
                        current plan, along with any changes you have not saved.
                        Paydays already recorded keep their figures.
                    </DialogDescription>

                    <Form
                        {...importRoute.form()}
                        options={{ preserveScroll: true }}
                        onSuccess={() => {
                            setIsOpen(false);
                            onImported();
                        }}
                        className="space-y-6"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="plan-file">Plan file</Label>
                                    <Input
                                        id="plan-file"
                                        name="file"
                                        type="file"
                                        accept="application/json,.json"
                                        required
                                        data-test="plan-file"
                                    />
                                    {/*
                                     * One message whatever went wrong: the
                                     * request stops at the first failure, and
                                     * a broken plan field is keyed by its own
                                     * name rather than by the file.
                                     */}
                                    <InputError
                                        data-test="plan-file-error"
                                        className="text-destructive"
                                        message={Object.values(errors)[0]}
                                    />
                                </div>

                                <DialogFooter className="gap-2">
                                    <DialogClose asChild>
                                        <Button variant="secondary">
                                            Cancel
                                        </Button>
                                    </DialogClose>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        data-test="confirm-import-plan"
                                    >
                                        Replace my plan
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>
        </>
    );
}
