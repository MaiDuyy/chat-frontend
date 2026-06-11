import React from 'react';
import { cn } from '@/lib/utils';

interface HubNodeLogoProps extends React.SVGProps<SVGSVGElement> {
    size?: number;
}

export function HubNodeLogo({ size = 24, className, ...props }: HubNodeLogoProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('text-accent-mint select-none transition-all duration-300', className)}
            {...props}
        >
            {/* 4 Diagonal Spokes */}
            <path
                d="M10 10L6.5 6.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path
                d="M14 10L17.5 6.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path
                d="M10 14L6.5 17.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path
                d="M14 14L17.5 17.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />

            {/* 4 Outer Circle Nodes */}
            <circle cx="6" cy="6" r="1.5" fill="currentColor" />
            <circle cx="18" cy="6" r="1.5" fill="currentColor" />
            <circle cx="6" cy="18" r="1.5" fill="currentColor" />
            <circle cx="18" cy="18" r="1.5" fill="currentColor" />

            {/* Top Chevrons */}
            <path
                d="M6 4L12 10L18 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M9 4L12 7L15 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Bottom Chevrons */}
            <path
                d="M18 20L12 14L6 20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M15 20L12 17L9 20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Left Chevrons */}
            <path
                d="M4 6L10 12L4 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M4 9L7 12L4 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Right Chevrons */}
            <path
                d="M20 6L14 12L20 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M20 9L17 12L20 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

interface HubNodeBrandProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: number;
    textClassName?: string;
}

export function HubNodeBrand({ size = 28, className, textClassName, ...props }: HubNodeBrandProps) {
    return (
        <div className={cn('flex items-center gap-2.5 select-none group', className)} {...props}>
            <div className="relative flex items-center justify-center p-1.5 rounded-sm bg-panel border border-panel-border transition-all duration-300 group-hover:border-accent-mint/35">
                <HubNodeLogo size={size} className="group-hover:scale-105" />
            </div>
            <div className="flex flex-col justify-center">
                <span className={cn('text-lg font-bold tracking-tight text-foreground transition-all duration-200 group-hover:text-accent-mint', textClassName)}>
                    NEXUS
                </span>
                <span className="text-[9px] font-mono tracking-widest text-text-muted uppercase leading-none mt-0.5">
                    Operator
                </span>
            </div>
        </div>
    );
}
