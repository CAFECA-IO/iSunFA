"use client";

import BrandLogo from "@/components/header/brand_logo";
import HeaderActions from "@/components/header/header_actions";

export default function UserHeader() {
  return (
    <header className="bg-surface-raised/90 ring-border-default sticky top-0 z-50 w-full shadow-sm ring-1 backdrop-blur-xl">
      <nav
        className="flex items-center justify-between p-3 lg:px-8"
        aria-label="Global"
      >
        <BrandLogo />
        <HeaderActions />
      </nav>
    </header>
  );
}
