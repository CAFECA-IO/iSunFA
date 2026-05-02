'use client';

import Head from 'next/head';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import AnalysisView from '@/components/user/analysis/analysis_view';

export default function AnalysisPage() {
  return (
    <main
      className="flex flex-col text-gray-900 font-sans w-full max-w-7xl mx-auto px-6 py-12 space-y-8 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <Head>
        <title>iSunFA Analysis</title>
      </Head>
      <div className="flex-1 w-full max-w-7xl mx-auto space-y-12 z-10 relative">
        <Suspense fallback={<div className="min-h-[400px] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
          <AnalysisView />
        </Suspense>
      </div>
    </main>
  );
}
