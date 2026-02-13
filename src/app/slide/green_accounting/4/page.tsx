'use client';

import { Users, Database, Coins, AlertTriangle } from 'lucide-react';

export default function GreenAccountingSlide4() {
  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-4 font-sans">
      <div className="w-[1280px] h-[720px] bg-neutral-950 relative overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-neutral-800 text-white">

        {/* Info: (20260212 - Luphia) Background Gloomier for Problem Statement */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-red-900/10 blur-[120px] rounded-full" />
          <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] bg-orange-900/10 blur-[100px] rounded-full" />
        </div>

        <div className="z-10 w-full max-w-6xl px-12 flex flex-col h-full py-16">

          {/* Info: (20260212 - Luphia) Title Section */}
          <div className="mb-12 space-y-2 text-center">
            <h2 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-200 via-orange-200 to-amber-200">
              傳統痛點：企業轉型困境
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-red-500 to-orange-500 rounded-full mx-auto" />
            <p className="text-neutral-400 text-lg mt-4 font-light">
              面對淨零碳排浪潮，企業普遍面臨的四大挑戰
            </p>
          </div>

          {/* Info: (20260212 - Luphia) 2x2 Grid for Pain Points */}
          <div className="grid grid-cols-2 gap-6 flex-1">

            {/* Info: (20260212 - Luphia) Pain Point 1: Human Resource Drain */}
            <div className="group relative bg-neutral-900/40 border border-white/5 p-6 rounded-2xl backdrop-blur-md hover:border-red-500/30 transition-all duration-500 flex items-start gap-6">
              <div className="w-16 h-16 bg-red-500/10 rounded-xl flex-shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="text-red-400 w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-red-300 transition-colors">人力耗損</h3>
                <p className="text-neutral-400 leading-relaxed text-sm">
                  高度依賴人工收集單據與計算，跨部門溝通成本高昂，重複作業消耗寶貴人力資源，且易產生人為失誤。
                </p>
              </div>
            </div>

            {/* Info: (20260212 - Luphia) Pain Point 2: Data Silos */}
            <div className="group relative bg-neutral-900/40 border border-white/5 p-6 rounded-2xl backdrop-blur-md hover:border-orange-500/30 transition-all duration-500 flex items-start gap-6">
              <div className="w-16 h-16 bg-orange-500/10 rounded-xl flex-shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Database className="text-orange-400 w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-orange-300 transition-colors">數據孤島</h3>
                <p className="text-neutral-400 leading-relaxed text-sm">
                  ERP、Excel 與各類營運系統各自為政，碳數據散落在不同平台，難以即時整合與勾稽，缺乏決策所需的全局視野。
                </p>
              </div>
            </div>

            {/* Info: (20260212 - Luphia) Pain Point 3: Carbon Fees & Tariffs */}
            <div className="group relative bg-neutral-900/40 border border-white/5 p-6 rounded-2xl backdrop-blur-md hover:border-amber-500/30 transition-all duration-500 flex items-start gap-6">
              <div className="w-16 h-16 bg-amber-500/10 rounded-xl flex-shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Coins className="text-amber-400 w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">碳費與碳關稅衝擊</h3>
                <p className="text-neutral-400 leading-relaxed text-sm">
                  國內碳費開徵與歐盟 CBAM 強勢來襲，缺乏精確的碳成本估算能力，恐將面臨鉅額合規成本，侵蝕企業獲利。
                </p>
              </div>
            </div>

            {/* Info: (20260212 - Luphia) Pain Point 4: ESG Anxiety */}
            <div className="group relative bg-neutral-900/40 border border-white/5 p-6 rounded-2xl backdrop-blur-md hover:border-yellow-500/30 transition-all duration-500 flex items-start gap-6">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-xl flex-shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
                <AlertTriangle className="text-yellow-400 w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-yellow-300 transition-colors">ESG 焦慮</h3>
                <p className="text-neutral-400 leading-relaxed text-sm">
                  供應鏈要求日益嚴格，投資人與利害關係人對永續績效的檢視標準提高，企業面臨巨大的轉型壓力與品牌形象風險。
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Info: (20260212 - Luphia) Footer */}
        <div className="absolute bottom-6 w-full px-16 flex justify-between text-neutral-500 text-[10px] tracking-[0.2em] uppercase font-medium">
          <div>領航淨零，智算未來</div>
          <div className="flex gap-2 items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
            2026 CAFECA Fintech
          </div>
        </div>

      </div>
    </div>
  );
}
