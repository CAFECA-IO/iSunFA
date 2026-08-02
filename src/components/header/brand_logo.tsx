"use client";

import Link from "next/link";
import pkg from "@/package";
import BrandLogoImage from "@/components/common/brand_logo_image";

export default function BrandLogo() {
  return (
    <div className="flex lg:flex-1">
      <Link
        href="/"
        className="-m-1.5 flex flex-col items-end gap-x-2 p-1.5 transition-opacity hover:opacity-80 lg:flex-row"
      >
        <span className="sr-only">iSunFA</span>
        <BrandLogoImage className="h-8 w-auto" width={125} height={40} />
        <span className="text-text-muted font-mono text-[10px] md:text-xs lg:mb-1.5 lg:ml-1">
          v{pkg.version}
        </span>
      </Link>
    </div>
  );
}
