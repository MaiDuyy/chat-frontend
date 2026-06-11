import React from "react";
import { cn } from "@/lib/utils";
import { getAvatarUrl } from "@/src/utils/image-utils";

interface MediaTabProps {
    mediaMessages: any[];
    mediaFilter: "all" | "image" | "video" | "file";
    setMediaFilter: (filter: "all" | "image" | "video" | "file") => void;
}

export function MediaTab({ mediaMessages, mediaFilter, setMediaFilter }: MediaTabProps) {
    const filters = ["all", "image", "video", "file"] as const;

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                {filters.map((f) => (
                    <button
                        key={f}
                        onClick={() => setMediaFilter(f)}
                        className={cn(
                            "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                            mediaFilter === f
                                ? "bg-primary text-white"
                                : "bg-muted text-muted-foreground hover:bg-muted"
                        )}
                    >
                        {f === "all" ? "Tất cả" : f === "image" ? "Hình ảnh" : f === "video" ? "Video" : "File"}
                    </button>
                ))}
            </div>
            {mediaMessages.length === 0 ? (
                <div className="text-center py-16 text-sm text-muted-foreground">Không có media nào</div>
            ) : (
                <div className="grid grid-cols-4 gap-2">
                    {mediaMessages.map((m: any, i: number) => (
                        <div
                            key={i}
                            className="aspect-square rounded-lg bg-muted overflow-hidden border border-border hover:border-border transition-colors cursor-pointer"
                        >
                            {m.type === "image" ? (
                                <img src={getAvatarUrl(m.content || "")} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl">
                                    {m.type === "video" ? "▶" : "📄"}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}