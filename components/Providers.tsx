"use client";

import { ThemeProvider } from "@/context/ThemeContext";
import { CallProvider } from "@/context/CallContext";
import CallModal from "@/components/Calls/CallModal";

export function Providers({ children, user }: { children: React.ReactNode, user?: any }) {
    return (
        <ThemeProvider>
            <CallProvider user={user}>
                {children}
                <CallModal />
            </CallProvider>
        </ThemeProvider>
    );
}
