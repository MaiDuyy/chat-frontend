"use client";

import { useRef, useEffect } from "react";

const POPULAR_EMOJIS = [
    "😀", "😂", "😍", "🥰", "😘", "😊", "😎", "🤔",
    "😢", "😭", "😡", "🥺", "😱", "🤗", "🤭", "🙄",
    "👍", "👎", "👏", "🙏", "💪", "🤝", "✌️", "🤞",
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
    "🔥", "⭐", "✨", "💯", "🎉", "🎊", "🎁", "🏆",
    "😴", "🤤", "😋", "🤪", "😜", "🙃", "😇", "🥳",
];

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-border p-3 w-72 z-50"
        >
            <div className="grid grid-cols-8 gap-1">
                {POPULAR_EMOJIS.map((emoji) => (
                    <button
                        key={emoji}
                        onClick={() => onSelect(emoji)}
                        className="w-8 h-8 flex items-center justify-center text-xl hover:bg-muted dark:hover:bg-muted rounded-md transition-colors"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    );
}
