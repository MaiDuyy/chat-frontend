import React from "react";

export function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground px-3 py-2 select-none">
            {children}
        </p>
    );
}