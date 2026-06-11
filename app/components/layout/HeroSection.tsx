"use client";

import React from 'react';
import Link from 'next/link';
import { Download, Globe, Terminal, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HubNodeLogo } from '@/components/ui/hub-node-logo';

export function HeroSection() {
    return (
        <section className="relative w-full min-h-[80vh] flex flex-col justify-center items-center py-20 lg:py-28 overflow-hidden bg-background">
            {/* Architectural CSS Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:40px_40px] opacity-[0.25] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

            {/* Glowing background accent */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-dim rounded-full blur-[120px] opacity-45 pointer-events-none"></div>

            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col items-center text-center space-y-8">
                
                {/* Visual Emblem */}
                <div className="animate-in fade-in zoom-in duration-700">
                    <HubNodeLogo size={64} className="text-accent-mint animate-pulse filter drop-shadow-[0_0_8px_rgba(0,242,148,0.25)]" />
                </div>

                {/* Subhead Tag */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-sm bg-accent-dim border border-accent-mint/20 text-accent-mint text-[11px] font-mono uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>NEXUS PLATFORM v2.0 // DEPLOYED</span>
                </div>

                {/* Giant Typographic Title */}
                <div className="space-y-4 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h1 className="text-[52px] sm:text-[80px] md:text-[110px] lg:text-[140px] font-black tracking-tighter leading-[0.85] text-foreground uppercase select-none">
                        NEXUS
                    </h1>
                    <p className="text-sm font-mono tracking-widest text-accent-mint uppercase">
                        Integrate and Intelligentize
                    </p>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-foreground max-w-2xl mx-auto tracking-tight leading-relaxed pt-2">
                        Nền tảng cộng tác doanh nghiệp thế hệ mới tích hợp Trợ lý AI (RAG + Agent).
                    </h2>
                </div>

                {/* Monospaced Capability Strip */}
                <div className="w-full max-w-3xl border-t border-b border-border py-4 my-6 font-mono text-xs text-text-secondary flex flex-wrap justify-center items-center gap-x-6 gap-y-2 select-none animate-in fade-in slide-in-from-bottom-6 duration-1000">
                    <span className="flex items-center gap-1.5">SECURE WORKSPACES</span>
                    <span className="text-text-muted">//</span>
                    <span className="flex items-center gap-1.5">ORGANIZATIONAL HIERARCHY</span>
                    <span className="text-text-muted">//</span>
                    <span className="flex items-center gap-1.5">RAG KNOWLEDGE BASE</span>
                    <span className="text-text-muted">//</span>
                    <span className="flex items-center gap-1.5">REAL-TIME MESSAGING</span>
                </div>

                {/* CTA Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto pt-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <Link href="/register" className="w-full sm:w-auto">
                        <Button className="w-full sm:w-auto bg-accent-mint hover:bg-accent-emerald text-background h-12 px-8 rounded-sm font-bold text-sm shadow-md shadow-accent-mint/10 flex items-center justify-center gap-2 group active:scale-[0.98] transition-all">
                            Bắt đầu trải nghiệm
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </Link>
                    <Button variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-sm font-bold text-sm border-border hover:bg-accent flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                        <Download className="w-4 h-4" />
                        Tải ứng dụng desktop
                    </Button>
                </div>

                {/* Strategic Operator Trust Metrics */}
                <div className="flex items-center justify-center gap-8 pt-10 border-t border-border w-full max-w-lg mx-auto animate-in fade-in duration-1000 delay-500 font-mono">
                    <div className="flex flex-col items-center">
                        <span className="text-xl font-bold text-foreground">10M+</span>
                        <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-0.5">Active Users</span>
                    </div>
                    <div className="w-px h-8 bg-border"></div>
                    <div className="flex flex-col items-center">
                        <span className="text-xl font-bold text-foreground">99.9%</span>
                        <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-0.5">Uptime SLA</span>
                    </div>
                    <div className="w-px h-8 bg-border"></div>
                    <div className="flex flex-col items-center">
                        <span className="text-xl font-bold text-foreground">&lt;50ms</span>
                        <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-0.5">Latency</span>
                    </div>
                </div>

            </div>
        </section>
    );
}

export default HeroSection;
