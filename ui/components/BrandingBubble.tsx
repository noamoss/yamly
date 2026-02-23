"use client";

import Image from "next/image";

/**
 * Floating credit footer per The Pitz Studio brand guidelines (required on every page).
 * Fixed bottom-right, semi-opaque with backdrop blur, logo + "The Pitz Studio" link.
 */
export default function BrandingBubble() {
  return (
    <a
      href="https://about.thepitz.studio/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Made by The Pitz Studio"
      className="fixed bottom-4 right-4 z-50 bg-white/90 backdrop-blur-sm text-[var(--brand-text)] border border-[var(--brand-secondary)]/20 px-3 py-2 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-md hover:underline font-semibold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)] focus:ring-offset-2 hidden md:inline-flex items-center gap-2"
      style={{ color: "var(--brand-text)" }}
    >
      <Image
        src="/favicon.svg"
        alt="The Pitz Studio"
        width={24}
        height={24}
        className="flex-shrink-0"
      />
      <span>The Pitz Studio</span>
    </a>
  );
}
