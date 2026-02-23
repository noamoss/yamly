"use client";

import Image from "next/image";

export default function BrandingBubble() {
  return (
    <a
      href="https://about.thepitz.studio/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Made by The Pitz Studio"
      className="fixed bottom-4 right-4 z-50 bg-[var(--brand-background)] text-[var(--brand-text)] border border-[var(--brand-secondary)]/30 px-4 py-2 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)] focus:ring-offset-2 hidden md:flex items-center gap-2"
    >
      <Image
        src="/favicon.svg"
        alt="The Pitz Studio"
        width={24}
        height={24}
        className="flex-shrink-0"
      />
      <span className="text-sm font-medium">The Pitz Studio</span>
    </a>
  );
}
