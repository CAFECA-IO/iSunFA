'use client';

import { ScanSearch, Leaf, Gift } from 'lucide-react';

export default function GreenAccountingSlide8() {
  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-4 font-sans">
      <div className="w-[1280px] h-[720px] bg-neutral-950 relative overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-neutral-800 text-white">

        {/* Info: (20260212 - Luphia) Background: Subtle Tech Glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-[20%] w-[60%] h-[60%] bg-emerald-900/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 left-[20%] w-[50%] h-[50%] bg-teal-900/10 blur-[100px] rounded-full" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none"></div>
        </div>

        <div className="z-10 w-full max-w-6xl px-12 flex flex-col h-full py-12">

          {/* Info: (20260212 - Luphia) Title Section */}
          <div className="mb-12 text-center space-y-4">
            <h2 className="text-5xl font-extrabold tracking-tight text-white">
              數據領航：智能會計核心與 ESG 無縫銜接
            </h2>
            <div className="h-1 w-32 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mx-auto mt-6" />
          </div>

          {/* Info: (20260212 - Luphia) Two Main Columns */}
          <div className="grid grid-cols-2 gap-12 flex-1 items-center px-8 relative">

            {/* Info: (20260212 - Luphia) Center Divider */}
            <div className="absolute left-1/2 top-8 bottom-8 w-[1px] bg-gradient-to-b from-transparent via-neutral-700 to-transparent hidden md:block"></div>

            {/* Info: (20260212 - Luphia) Left Card: Smart OCR */}
            <div className="group relative p-8 h-full flex flex-col">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 bg-orange-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(249,115,22,0.1)]">
                  <ScanSearch className="text-orange-400 w-10 h-10" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Gift className="w-5 h-5 text-orange-400" />
                    <h3 className="text-3xl font-bold text-white group-hover:text-orange-300 transition-colors">智能憑證辨識</h3>
                  </div>
                  <span className="text-orange-500 font-mono text-sm">(Smart OCR)</span>
                </div>
              </div>

              <div className="space-y-8 flex-1 pl-4">
                <div className="flex gap-4">
                  <div className="w-2 h-2 rotate-45 bg-orange-500 mt-2 shrink-0" />
                  <div>
                    <h4 className="text-lg font-bold text-white mb-2">精準提取：</h4>
                    <p className="text-neutral-400 leading-relaxed">
                      透過語意理解技術，<span className="text-white">精準辨識發票、單據日期、統編與金額</span>。
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-2 h-2 rotate-45 bg-orange-500 mt-2 shrink-0" />
                  <div>
                    <h4 className="text-lg font-bold text-white mb-2">非結構化支援：</h4>
                    <p className="text-neutral-400 leading-relaxed">
                      即便是格式不一的收據或車票，也能<span className="text-white">快速數位化歸檔</span>。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Info: (20260212 - Luphia) Right Card: GHG Accounting */}
            <div className="group relative p-8 h-full flex flex-col">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                  <Leaf className="text-emerald-400 w-10 h-10" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Gift className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-3xl font-bold text-white group-hover:text-emerald-300 transition-colors">溫室氣體核算</h3>
                  </div>
                  <span className="text-emerald-500 font-mono text-sm">(GHG Accounting)</span>
                </div>
              </div>

              <div className="space-y-8 flex-1 pl-4">
                <div className="flex gap-4">
                  <div className="w-2 h-2 rotate-45 bg-emerald-500 mt-2 shrink-0" />
                  <div>
                    <h4 className="text-lg font-bold text-white mb-2">自動換算：</h4>
                    <p className="text-neutral-400 leading-relaxed">
                      內建碳排係數資料庫，依據發票與營運數據，<span className="text-white">自動計算碳排放量</span>。
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-2 h-2 rotate-45 bg-emerald-500 mt-2 shrink-0" />
                  <div>
                    <h4 className="text-lg font-bold text-white mb-2">合規報表：</h4>
                    <p className="text-neutral-400 leading-relaxed">
                      產出 ISO 14064 合規預審報告，<span className="text-emerald-400 font-bold">精準對接國內外減碳申報標準</span>。
                    </p>
                  </div>
                </div>
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
