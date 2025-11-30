"use client";

import Link from "next/link";
import Image from "next/image";

export default function BrandingBubble() {
  return (
    <Link
      href="https://about.thepitz.studio/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Made by The Pitz Studio"
      className="fixed bottom-4 right-4 z-50 bg-white text-[#1E293B] border border-gray-200 px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 hidden md:flex items-center gap-2"
    >
      <Image
        src="/favicon.svg"
        alt="The Pitz Studio"
        width={24}
        height={24}
        className="flex-shrink-0"
      />
      <span className="text-sm font-medium">The Pitz Studio</span>
    </Link>
  );
}
