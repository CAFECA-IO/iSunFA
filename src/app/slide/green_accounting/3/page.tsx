'use client';

import { ShieldCheck, Cpu, BarChart3 } from 'lucide-react';

export default function GreenAccountingSlide3() {
  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-4 font-sans">
      <div className="w-[1280px] h-[720px] bg-neutral-950 relative overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-neutral-800 text-white">

        {/* Info: (20260212 - Luphia) 背景光暈優化：更深邃的極光綠 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] bg-emerald-900/20 blur-[120px] rounded-full" />
          <div className="absolute -bottom-[20%] -right-[10%] w-[40%] h-[40%] bg-teal-900/10 blur-[100px] rounded-full" />
        </div>

        <div className="z-10 w-full max-w-6xl px-12 flex flex-col h-full py-16">

          {/* Info: (20260212 - Luphia) 標題區：強化領航者格局 */}
          <div className="mb-16 space-y-2">
            <h2 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-200 to-emerald-500">
              戰略核心價值
            </h2>
            <div className="h-1 w-24 bg-emerald-500 rounded-full" />
            <p className="text-neutral-400 text-lg mt-4 font-light">領航淨零時代，建立碳管理標竿企業的絕對優勢</p>
          </div>

          {/* Info: (20260212 - Luphia) 三大卡片：更精緻的 Border 與 Hover 效果 */}
          <div className="grid grid-cols-3 gap-8 flex-1 items-start">

            {/* Info: (20260212 - Luphia) Highlight 1: 官方背書 */}
            <div className="group relative bg-neutral-900/40 border border-white/10 p-8 rounded-3xl h-full backdrop-blur-xl hover:border-emerald-500/50 transition-all duration-500">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="text-emerald-400 w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-emerald-300">權威合規保障</h3>
              <p className="text-neutral-400 leading-relaxed mb-6">
                對接最新氣候法案，確保數據符合官方審核標準，將政策義務轉化為營運紅利。
              </p>
              <div className="inline-flex items-center px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                <span className="text-xs text-emerald-400 font-medium">最高政府補助 $40,000</span>
              </div>
            </div>

            {/* Info: (20260212 - Luphia) Highlight 2: AI 賦能 */}
            <div className="group relative bg-neutral-900/40 border border-white/10 p-8 rounded-3xl h-full backdrop-blur-xl hover:border-emerald-500/50 transition-all duration-500">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Cpu className="text-emerald-400 w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-emerald-300">智能決策賦能</h3>
              <p className="text-neutral-400 leading-relaxed mb-6">
                導入 AI 碳預測模型，實時監控排碳熱點，<span className="text-emerald-400 font-medium">大幅縮減繁瑣人力作業流程</span>，由「事後盤查」轉向「事前精算」的戰略轉型。
              </p>
              <div className="inline-flex items-center px-3 py-1 bg-neutral-800 border border-neutral-700 rounded-full">
                <span className="text-xs text-neutral-300 font-medium">AI 驅動・自動化核算</span>
              </div>
            </div>

            {/* Info: (20260212 - Luphia) Highlight 3: 雙重轉型 */}
            <div className="group relative bg-emerald-500/[0.03] border border-emerald-500/20 p-8 rounded-3xl h-full backdrop-blur-xl hover:border-emerald-500/50 transition-all duration-500 overflow-hidden">
              {/* Info: (20260212 - Luphia) 裝飾性背景效果 */}
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/10 blur-3xl group-hover:bg-emerald-500/20 transition-colors" />

              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="text-emerald-400 w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">標竿減碳利潤</h3>
              <p className="text-neutral-400 leading-relaxed mb-6">
                滿足「自主減量計畫」目標 A，將碳費負擔降至地板價格，優化企業財務指標。
              </p>
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-emerald-400">83%</span>
                  <span className="text-sm text-emerald-500/80 mb-1 font-bold">碳費極大化減免</span>
                </div>
                <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[83%] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Info: (20260212 - Luphia) Footer */}
        <div className="absolute bottom-6 w-full px-16 flex justify-between text-neutral-500 text-[10px] tracking-[0.2em] uppercase font-medium">
          <div>領航淨零，智算未來</div>
          <div className="flex gap-2 items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            2026 CAFECA Fintech
          </div>
        </div>

      </div>
    </div>
  );
}
