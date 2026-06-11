import React from "react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

interface GroupSettingsHeaderProps {
    title: string;
    action?: () => void;
    actionLabel?: string;
}

export function GroupSettingsHeader({ title, action, actionLabel }: GroupSettingsHeaderProps) {
    return (
        <div className="h-12 border-b border-border px-5 flex items-center justify-between flex-shrink-0 bg-white">
            <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
            {action && (
                <Button
                    size="sm"
                    className="h-7 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-white rounded-md px-3"
                    onClick={action}
                >
                    <UserPlus className="w-3 h-3" />
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}