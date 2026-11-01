import { Form, Head, usePage } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

/**
 * Where an unconfirmed account lands. The link goes out once, at sign-up; a
 * later sign-in sends nothing, so the copy says where the link went rather than
 * claiming one was "just" sent.
 */
export default function VerifyEmail({ status }: { status?: string }) {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Confirm your email" />

            <div className="space-y-6 text-center">
                <p className="text-sm text-muted-foreground">
                    We sent a confirmation link to{' '}
                    <span
                        data-test="verify-email-address"
                        className="font-medium break-all text-foreground"
                    >
                        {auth.user.email}
                    </span>{' '}
                    when you signed up. Open it to start using Kept.
                </p>

                {status === 'verification-link-sent' ? (
                    <p
                        role="status"
                        data-test="verification-link-sent"
                        className="rounded-lg bg-jade/10 px-3 py-2 text-sm font-medium text-jade-ink"
                    >
                        A new link is on its way. Check your inbox.
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Can't find it? Check your spam folder, or send a new
                        one.
                    </p>
                )}

                <Form {...send.form()} className="space-y-6">
                    {({ processing }) => (
                        <>
                            <Button
                                disabled={processing}
                                variant="secondary"
                                data-test="resend-verification"
                            >
                                {processing && <Spinner />}
                                Send a new link
                            </Button>

                            <TextLink
                                href={logout()}
                                className="mx-auto block text-sm"
                            >
                                Log out
                            </TextLink>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Confirm your email',
    description: 'One step left before you can start planning.',
};
