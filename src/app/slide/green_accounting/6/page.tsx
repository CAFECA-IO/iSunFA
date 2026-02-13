'use client';

import { ScanText, Zap, BarChart3, ArrowRightLeft, Database } from 'lucide-react';

export default function GreenAccountingSlide6() {
  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-4 font-sans">
      <div className="w-[1280px] h-[720px] bg-neutral-950 relative overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-neutral-800 text-white">

        {/* Info: (20260212 - Luphia) 背景光暈：回歸生機與科技感的綠色 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[5%] w-[60%] h-[70%] bg-emerald-950/20 blur-[130px] rounded-full opacity-60" />
          <div className="absolute -bottom-[15%] -right-[10%] w-[50%] h-[60%] bg-teal-950/10 blur-[110px] rounded-full opacity-40" />
        </div>

        <div className="z-10 w-full max-w-6xl px-12 flex flex-col h-full py-12">

          {/* Info: (20260212 - Luphia) 標題區 */}
          <div className="mb-8 space-y-4">
            <div className="flex items-center gap-3 text-emerald-500 mb-2">
              <div className="px-2 py-0.5 border border-emerald-500/50 rounded text-[10px] font-bold tracking-widest bg-emerald-500/10 uppercase">Core Architecture</div>
              <Zap size={18} className="fill-emerald-500" />
            </div>
            <h2 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-emerald-400">
              四大智能核心：定義淨零會計標準
            </h2>
            <div className="flex items-center gap-4">
              <div className="h-[2px] w-20 bg-emerald-600" />
              <p className="text-neutral-500 text-lg font-light italic">
                整合 AI 算力與綠色準則，將碳數據轉化為戰略資產
              </p>
            </div>
          </div>

          {/* Info: (20260212 - Luphia) 模組矩陣：2x2 Grid */}
          <div className="grid grid-cols-2 gap-6 flex-1">

            {/* Info: (20260212 - Luphia) Module 1: 智能憑證辨識 */}
            <div className="group relative bg-neutral-900/40 border border-white/5 px-6 py-5 rounded-3xl backdrop-blur-xl hover:bg-neutral-900/60 hover:border-emerald-500/30 transition-all duration-500 overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <ScanText className="text-emerald-400 w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-500/5 px-2 py-1 rounded">Module 01</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">智能憑證辨識</h3>
              <p className="text-neutral-400 leading-relaxed text-xs">
                搭載高精度 AI-OCR 引擎，自動分類電力、燃料及營運憑證。不僅辨識文字，更能自動勾稽發票號碼與供應商碳排特徵，消除 95% 的手動登錄錯誤。
              </p>
              <div className="mt-auto pt-2 flex items-center gap-2 text-[10px] text-emerald-500/60 font-mono">
                <span>[ AI_MODEL_V2.0 ]</span>
                <span className="w-1 h-1 rounded-full bg-emerald-900"></span>
                <span>AUTO_EXTRACTION</span>
              </div>
            </div>

            {/* Info: (20260212 - Luphia) Module 2: 自動記帳引擎 */}
            <div className="group relative bg-neutral-900/40 border border-white/5 px-6 py-5 rounded-3xl backdrop-blur-xl hover:bg-neutral-900/60 hover:border-emerald-500/30 transition-all duration-500">
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <ArrowRightLeft className="text-emerald-400 w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-500/5 px-2 py-1 rounded">Module 02</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">平行自動記帳</h3>
              <p className="text-neutral-400 leading-relaxed text-xs">
                獨創「財務-碳排」雙軌記帳技術。在處理財務帳務的同時，自動換算對應之碳排放量，實現財報與碳報同步生成，確保數據的一致性與可追溯性（Audit Trail）。
              </p>
              <div className="mt-auto pt-2 flex items-center gap-2 text-[10px] text-emerald-500/60 font-mono">
                <span>[ DUAL_LEDGER_SYNC ]</span>
                <span className="w-1 h-1 rounded-full bg-emerald-900"></span>
                <span>REAL_TIME_POSTING</span>
              </div>
            </div>

            {/* Info: (20260212 - Luphia) Module 3: 溫室氣體核算資料庫 */}
            <div className="group relative bg-emerald-500/[0.02] border border-emerald-500/10 px-6 py-5 rounded-3xl backdrop-blur-xl hover:bg-neutral-900/60 hover:border-emerald-500/30 transition-all duration-500">
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <Database className="text-emerald-400 w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded">Compliance Core</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">動態核算資料庫</h3>
              <p className="text-neutral-400 leading-relaxed text-xs">
                內建國際（IPCC, IEA）及國內環境部最新排放係數。支援 ISO 14064-1 規範，為企業申請「自主減量計畫目標 A」提供最科學的計算基石，直取 50 元優惠費率。
              </p>
              <div className="mt-auto pt-2 flex items-center gap-2 text-[10px] text-emerald-500/60 font-mono">
                <span>[ ISO_14064_READY ]</span>
                <span className="w-1 h-1 rounded-full bg-emerald-900"></span>
                <span>LATEST_FACTORS_2026</span>
              </div>
            </div>

            {/* Info: (20260212 - Luphia) Module 4: 戰略會計報表 */}
            <div className="group relative bg-neutral-900/40 border border-white/5 px-6 py-5 rounded-3xl backdrop-blur-xl hover:bg-neutral-900/60 hover:border-emerald-500/30 transition-all duration-500">
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <BarChart3 className="text-emerald-400 w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-500/5 px-2 py-1 rounded">Module 04</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">領航戰略報表</h3>
              <p className="text-neutral-400 leading-relaxed text-xs">
                將枯燥的數據視覺化為「碳損益表」與「預測模型」。協助決策主管層掌握碳預算執行率，模擬不同減碳方案的財務回報，讓淨零路徑具備高度的經營導向。
              </p>
              <div className="mt-auto pt-2 flex items-center gap-2 text-[10px] text-emerald-500/60 font-mono">
                <span>[ STRATEGIC_DASHBOARD ]</span>
                <span className="w-1 h-1 rounded-full bg-emerald-900"></span>
                <span>CBAM_COMPLIANT</span>
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
