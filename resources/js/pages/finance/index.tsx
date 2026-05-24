import { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { dashboard } from '@/routes';
import { edit as financeSettings } from '@/routes/finance';

const frequencies = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'biweekly', label: 'Biweekly' },
    { value: 'weekly', label: 'Weekly' },
];

const storageKey = 'financeSettings';

type FinanceSettings = {
    monthlySalary: string;
    payFrequency: string;
    nextPayday: string;
    monthlyBudget: string;
    savingsGoal: string;
    emergencyBuffer: string;
};

const defaultSettings: FinanceSettings = {
    monthlySalary: '',
    payFrequency: 'monthly',
    nextPayday: '',
    monthlyBudget: '',
    savingsGoal: '',
    emergencyBuffer: '',
};

const parseNumber = (value: string) => {
    return Number(value.replace(/[^0-9.-]/g, '')) || 0;
};

const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString('en-US', {
        maximumFractionDigits: 0,
    })}`;
};

export default function FinanceSettings() {
    const [settings, setSettings] = useState<FinanceSettings>(defaultSettings);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const stored = window.localStorage.getItem(storageKey);
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as FinanceSettings;
                setSettings({ ...defaultSettings, ...parsed });
            } catch {
                window.localStorage.removeItem(storageKey);
            }
        }
    }, []);

    const handleSave = () => {
        window.localStorage.setItem(storageKey, JSON.stringify(settings));
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2000);
    };

    const monthlySalary = parseNumber(settings.monthlySalary);
    const monthlyBudget = parseNumber(settings.monthlyBudget);
    const savingsGoal = parseNumber(settings.savingsGoal);
    const emergencyBuffer = parseNumber(settings.emergencyBuffer);
    const available = monthlySalary - monthlyBudget;

    return (
        <>
            <Head title="Finance settings" />

            <div className="space-y-6 w-full max-w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                <div className="space-y-3">
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        Finance
                    </p>
                    <h1 className="text-3xl font-semibold text-foreground">Finance settings</h1>
                    <p className="text-sm text-muted-foreground max-w-none">
                        Set your monthly salary, budget goals, and savings targets to drive your dashboard metrics.
                    </p>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.65fr_0.95fr] w-full">
                    <Card className="overflow-hidden w-full">
                        <CardHeader>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle>Income & goals</CardTitle>
                                    <CardDescription>
                                        Update the values you want to use in your monthly finance model.
                                    </CardDescription>
                                </div>
                                <Badge variant="secondary">Frontend only</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2 w-full">
                                <div className="grid gap-2 w-full">
                                    <Label htmlFor="monthlySalary">Monthly salary</Label>
                                    <Input
                                        id="monthlySalary"
                                        placeholder="₱0"
                                        value={settings.monthlySalary}
                                        onChange={(event) =>
                                            setSettings({
                                                ...settings,
                                                monthlySalary: event.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="grid gap-2 w-full">
                                    <Label htmlFor="payFrequency">Pay frequency</Label>
                                    <Select
                                        value={settings.payFrequency}
                                        onValueChange={(value) =>
                                            setSettings({ ...settings, payFrequency: value })
                                        }
                                    >
                                        <SelectTrigger id="payFrequency" className="w-full">
                                            <SelectValue placeholder="Frequency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {frequencies.map((item) => (
                                                <SelectItem key={item.value} value={item.value}>
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="nextPayday">Next payday</Label>
                                    <Input
                                        id="nextPayday"
                                        type="date"
                                        value={settings.nextPayday}
                                        onChange={(event) =>
                                            setSettings({ ...settings, nextPayday: event.target.value })
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="monthlyBudget">Monthly budget</Label>
                                    <Input
                                        id="monthlyBudget"
                                        placeholder="₱0"
                                        value={settings.monthlyBudget}
                                        onChange={(event) =>
                                            setSettings({ ...settings, monthlyBudget: event.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="savingsGoal">Savings goal</Label>
                                    <Input
                                        id="savingsGoal"
                                        placeholder="₱0"
                                        value={settings.savingsGoal}
                                        onChange={(event) =>
                                            setSettings({ ...settings, savingsGoal: event.target.value })
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="emergencyBuffer">Emergency buffer</Label>
                                    <Input
                                        id="emergencyBuffer"
                                        placeholder="₱0"
                                        value={settings.emergencyBuffer}
                                        onChange={(event) =>
                                            setSettings({ ...settings, emergencyBuffer: event.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 rounded-3xl border border-border bg-muted p-4 text-sm text-muted-foreground">
                                <p className="font-medium text-foreground">Tips</p>
                                <ul className="list-disc space-y-2 pl-5">
                                    <li>Use this page to define your income and budget assumptions.</li>
                                    <li>Later, backend automation can use these values to seed monthly updates.</li>
                                    <li>Keep the annual and monthly values aligned for more accurate forecasts.</li>
                                </ul>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <Button onClick={handleSave}>Save settings</Button>
                                {saved && <span className="text-sm text-emerald-400">Saved locally.</span>}
                                <Button variant="secondary" asChild size="sm">
                                    <Link href={dashboard()}>Back to dashboard</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-4 w-full">
                        <Card className="overflow-hidden w-full">
                            <CardHeader>
                                <CardTitle>Summary</CardTitle>
                                <CardDescription>Quick snapshot of your current values.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4">
                                    <div className="rounded-3xl border border-border bg-background p-4">
                                        <p className="text-sm text-muted-foreground">Monthly salary</p>
                                        <p className="mt-2 text-2xl font-semibold text-foreground">
                                            {monthlySalary ? formatCurrency(monthlySalary) : '–'}
                                        </p>
                                    </div>
                                    <div className="rounded-3xl border border-border bg-background p-4">
                                        <p className="text-sm text-muted-foreground">Remaining budget</p>
                                        <p className="mt-2 text-2xl font-semibold text-foreground">
                                            {monthlySalary ? formatCurrency(available) : '–'}
                                        </p>
                                    </div>
                                    <div className="rounded-3xl border border-border bg-background p-4">
                                        <p className="text-sm text-muted-foreground">Savings goal</p>
                                        <p className="mt-2 text-2xl font-semibold text-foreground">
                                            {savingsGoal ? formatCurrency(savingsGoal) : '–'}
                                        </p>
                                    </div>
                                    <div className="rounded-3xl border border-border bg-background p-4">
                                        <p className="text-sm text-muted-foreground">Emergency buffer</p>
                                        <p className="mt-2 text-2xl font-semibold text-foreground">
                                            {emergencyBuffer ? formatCurrency(emergencyBuffer) : '–'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}

FinanceSettings.layout = {
    breadcrumbs: [
        {
            title: 'Finance',
            href: financeSettings(),
        },
    ],
};
