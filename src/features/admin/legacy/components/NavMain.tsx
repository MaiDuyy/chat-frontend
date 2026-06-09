"use client"

import React from "react"
import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NavItem {
  title: string
  url?: string
  icon?: LucideIcon
  isActive?: boolean
  items?: {
    title: string
    url: string
    isActive?: boolean
  }[]
}

export function NavMain({ items = [] }: { items: NavItem[] }) {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <div className="flex flex-col gap-1 px-1 py-1">
      {!isCollapsed ? (
        <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-widest">
          Quản lý hệ thống
        </div>
      ) : (
        <div className="h-px bg-muted dark:bg-white/5 my-1.5 mx-2" />
      )}
      
      <div className="flex flex-col gap-1">
        {items.map((item) => {
          const itemButton = item.items?.length ? (
            <CollapsibleTrigger asChild>
              <button className={cn(
                  "group flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ease-in-out relative",
                  isCollapsed ? "justify-center" : "",
                  item.isActive 
                    ? "bg-muted dark:bg-muted/30 text-foreground font-semibold" 
                    : "text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground hover:bg-muted dark:hover:bg-muted/40"
              )}>
                {item.isActive && !isCollapsed && (
                  <span className="absolute left-0 top-2.5 bottom-2.5 w-[2px] bg-muted dark:bg-zinc-700 rounded-r" />
                )}
                {item.icon && (
                  <item.icon className={cn(
                    "w-3.5 h-3.5 shrink-0 transition-colors duration-200",
                    item.isActive 
                      ? "text-muted-foreground" 
                      : "text-muted-foreground dark:text-muted-foreground group-hover:text-muted-foreground dark:group-hover:text-muted-foreground"
                  )} />
                )}
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{item.title}</span>
                    <ChevronRight className="w-3 h-3 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-muted-foreground dark:text-muted-foreground group-hover:text-muted-foreground" />
                  </>
                )}
              </button>
            </CollapsibleTrigger>
          ) : (
            <Link
              href={item.url || "#"}
              className={cn(
                "group flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ease-in-out relative",
                isCollapsed ? "justify-center" : "",
                item.isActive 
                  ? "bg-blue-50/50 dark:bg-blue-950/20 text-primary font-semibold" 
                  : "text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground hover:bg-muted dark:hover:bg-muted/40"
              )}
            >
              {item.isActive && !isCollapsed && (
                <span className="absolute left-0 top-2.5 bottom-2.5 w-[2px] bg-primary dark:bg-blue-400 rounded-r" />
              )}
              {item.icon && (
                <item.icon className={cn(
                  "w-3.5 h-3.5 shrink-0 transition-colors duration-200",
                  item.isActive 
                    ? "text-primary" 
                    : "text-muted-foreground dark:text-muted-foreground group-hover:text-muted-foreground dark:group-hover:text-muted-foreground"
                )} />
              )}
              {!isCollapsed && <span className="flex-1 truncate">{item.title}</span>}
            </Link>
          );

          const triggerWithTooltip = isCollapsed ? (
            <TooltipProvider key={item.title} delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {itemButton}
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs bg-slate-900 text-white border-border">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : itemButton;

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive}
              className="group/collapsible"
            >
              <div className="flex flex-col">
                {item.items?.length ? (
                  <>
                    {triggerWithTooltip}
                    
                    {!isCollapsed && (
                      <CollapsibleContent className="overflow-hidden">
                        <div className="flex flex-col gap-0.5 ml-5 mt-1 border-l border-border dark:border-border/80 pl-3 py-0.5">
                          {item.items.map((subItem) => (
                            <Link
                              key={subItem.title}
                              href={subItem.url}
                              className={cn(
                                "block px-3 py-1.5 text-xs rounded transition-all duration-200 ease-in-out",
                                subItem.isActive 
                                  ? "font-semibold text-primary bg-blue-50/30 dark:bg-blue-950/10 border-l border-blue-600 dark:border-blue-400 -ml-[13px] pl-[12px]" 
                                  : "text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground hover:bg-muted/50 dark:hover:bg-muted/20"
                              )}
                            >
                              {subItem.title}
                            </Link>
                          ))}
                        </div>
                      </CollapsibleContent>
                    )}
                  </>
                ) : (
                  triggerWithTooltip
                )}
              </div>
            </Collapsible>
          );
        })}
      </div>
    </div>
  )
}
