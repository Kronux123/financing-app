import { Form, Head, usePage } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { edit as editNotifications } from '@/routes/notifications';

/**
 * Where the unsubscribe link in a payday reminder lands. Opening it only asks;
 * the button does it — see PaydayReminderUnsubscribeController for why.
 */
export default function Unsubscribe({
    unsubscribed,
}: {
    unsubscribed: boolean;
}) {
    /*
     * The button posts back to the link it was opened from. The signature is
     * in the query string, and it is what lets this work without signing in.
     */
    const { url } = usePage();

    return (
        <>
            <Head title="Payday reminders" />

            {unsubscribed ? (
                <div className="space-y-4 text-center">
                    <p
                        data-test="unsubscribed"
                        className="text-sm text-muted-foreground"
                    >
                        You won't get payday reminder emails any more. Your
                        paydays still open on their own. Check them on the
                        Payouts page.
                    </p>
                    <TextLink href={editNotifications()} className="text-sm">
                        Turn them back on in settings
                    </TextLink>
                </div>
            ) : (
                <Form
                    action={url}
                    method="post"
                    className="space-y-6 text-center"
                >
                    {({ processing }) => (
                        <>
                            <p className="text-sm text-muted-foreground">
                                You'll stop getting an email when a payday is
                                waiting for you to review. You can turn them
                                back on in settings at any time.
                            </p>
                            <Button
                                disabled={processing}
                                className="w-full"
                                data-test="confirm-unsubscribe"
                            >
                                {processing && <Spinner />}
                                Stop payday reminders
                            </Button>
                        </>
                    )}
                </Form>
            )}
        </>
    );
}

Unsubscribe.layout = {
    title: 'Payday reminders',
    description: 'Emails about paydays waiting for you to review',
};
