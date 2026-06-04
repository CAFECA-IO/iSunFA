"use client";

import Head from "next/head";
import DppDashboard from "@/components/user/digital_product_passport/dpp_dashboard";

export default function DigitalProductPassportPage() {
  return (
    <main
      className="mx-auto flex w-full max-w-7xl flex-col space-y-8 px-6 py-12 font-sans text-gray-900 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <Head>
        <title>iSunFA Digital Product Passport</title>
      </Head>
      <div className="relative z-10 mx-auto w-full max-w-7xl flex-1 space-y-12">
        <DppDashboard />
      </div>
    </main>
  );
}
