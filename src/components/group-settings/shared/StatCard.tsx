import React from "react";

interface StatCardProps {
    label: string;
    value: string | number;
    sub?: string;
}

export function StatCard({ label, value, sub }: StatCardProps) {
    return (
        <div className="bg-muted rounded-lg p-2 border border-border">
            <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
            <p className="text-xl font-semibold text-foreground">{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
    );
}