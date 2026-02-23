"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { ReactNode } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

export default function Tooltip({
  content,
  children,
  side = "top",
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          className="bg-[var(--foreground)] text-[var(--brand-background)] text-sm px-3 py-2 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.08)] z-50 max-w-xs"
          sideOffset={5}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-[var(--foreground)]" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
