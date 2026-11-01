import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import NotificationController from '@/actions/App/Http/Controllers/Settings/NotificationController';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { edit as editNotifications } from '@/routes/notifications';

export default function Notifications({
    paydayReminders,
}: {
    paydayReminders: boolean;
}) {
    const form = useForm({ payday_reminders: paydayReminders });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.submit(NotificationController.update(), {
            preserveScroll: true,
            // What was saved is the new baseline, so Save disables again.
            onSuccess: () => form.setDefaults(),
        });
    };

    return (
        <>
            <Head title="Notification settings" />

            <h1 className="sr-only">Notification settings</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Email notifications"
                    description="Choose what Kept emails you about"
                />

                <form onSubmit={submit} className="space-y-6">
                    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                        <Checkbox
                            id="payday_reminders"
                            data-test="payday-reminders-toggle"
                            checked={form.data.payday_reminders}
                            onCheckedChange={(checked) =>
                                form.setData(
                                    'payday_reminders',
                                    checked === true,
                                )
                            }
                            className="mt-0.5"
                        />
                        <div className="grid gap-1">
                            <Label htmlFor="payday_reminders">
                                Payday reminders
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                An email when a payday is waiting for you to
                                review: on the day, three days later, and a week
                                later, then no more. Several paydays come in one
                                email.
                            </p>
                        </div>
                    </div>

                    <Button
                        disabled={form.processing || !form.isDirty}
                        data-test="save-notifications"
                    >
                        Save
                    </Button>
                </form>
            </div>
        </>
    );
}

Notifications.layout = {
    breadcrumbs: [
        {
            title: 'Notification settings',
            href: editNotifications(),
        },
    ],
};
