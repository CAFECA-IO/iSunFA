"use client";

import Link from "next/link";
import Image from "next/image";
import pkg from "@/package";

export default function BrandLogo() {
  return (
    <div className="flex lg:flex-1">
      <Link
        href="/"
        className="-m-1.5 flex flex-col items-end gap-x-2 p-1.5 transition-opacity hover:opacity-80 lg:flex-row"
      >
        <span className="sr-only">iSunFA</span>
        <Image
          className="h-8 w-auto"
          src="/isunfa_logo_color.svg"
          alt="iSunFA Logo"
          width={125}
          height={40}
          priority
        />
        <span className="font-mono text-[10px] text-gray-500 md:text-xs lg:mb-1.5 lg:ml-1">
          v{pkg.version}
        </span>
      </Link>
    </div>
  );
}
