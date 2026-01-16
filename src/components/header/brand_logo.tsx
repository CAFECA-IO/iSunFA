'use client';

import Link from 'next/link';
import Image from 'next/image';
import pkg from '@/package';

export default function BrandLogo() {
  return (
    <div className="flex lg:flex-1">
      <Link href="/" className="-m-1.5 p-1.5 transition-opacity hover:opacity-80 flex items-end gap-2">
        <span className="sr-only">iSunFA</span>
        <Image
          className="h-8 w-auto"
          src="/isunfa_logo_color.svg"
          alt="iSunFA Logo"
          width={125}
          height={40}
          priority
        />
        <span className="text-xs text-gray-500 font-mono mb-1.5 ml-1">v{pkg.version}</span>
      </Link>
    </div>
  );
}
