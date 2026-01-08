import AppShell from "@/components/Layout/AppShell";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AppShell>
            {children}
        </AppShell>
    );
}
