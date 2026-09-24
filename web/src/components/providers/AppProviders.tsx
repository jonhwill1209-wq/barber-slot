"use client";
/* ================================================
    web/src/components/providers/AppProviders.tsx
================================================ */
import {AuthProvider} from "@/contexts/AuthContext";

export default function AppProviders({children,}: {children: React.ReactNode;}) {
    return (
        <AuthProvider>
            {children}
        </AuthProvider>
    );
}
