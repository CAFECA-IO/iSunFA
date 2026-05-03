"use client";

import Head from "next/head";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import AnalysisView from "@/components/user/analysis/analysis_view";

export default function AnalysisPage() {
  return (
    <main
      className="mx-auto flex w-full max-w-7xl flex-col space-y-8 px-6 py-12 font-sans text-gray-900 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <Head>
        <title>iSunFA Analysis</title>
      </Head>
      <div className="relative z-10 mx-auto w-full max-w-7xl flex-1 space-y-12">
        <Suspense
          fallback={
            <div className="flex min-h-[400px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          }
        >
          <AnalysisView />
        </Suspense>
      </div>
    </main>
  );
}
