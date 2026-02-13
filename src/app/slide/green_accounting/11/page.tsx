import React from 'react';
import { Landmark, Coins, TrendingUp, CheckCircle2, Percent, ArrowUpRight } from 'lucide-react';

export default function GreenAccountingSlide11() {
  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-4 font-sans">
      <div className="w-[1280px] h-[720px] bg-neutral-950 relative overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-neutral-800 text-white">

        {/* Info: (20260212 - Luphia) Background: Subtle Aurora & Finance Blue */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] right-[10%] w-[50%] h-[50%] bg-emerald-900/10 blur-[120px] rounded-full opacity-60" />
          <div className="absolute bottom-[10%] left-[5%] w-[40%] h-[40%] bg-blue-900/10 blur-[100px] rounded-full opacity-40" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none"></div>
        </div>

        <div className="z-10 w-full max-w-6xl px-12 flex flex-col h-full py-16">

          {/* Info: (20260212 - Luphia) Title Section */}
          <div className="mb-10 space-y-4 text-center">
            <div className="flex items-center justify-center gap-3 text-emerald-500 mb-2">
              <div className="px-3 py-1 border border-emerald-500/50 rounded-full text-[10px] font-bold tracking-[0.2em] bg-emerald-500/10 uppercase">Policy Dividends</div>
            </div>
            <h2 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-emerald-300">
              雙軸轉型：AI 賦能與政策紅利
            </h2>
            <p className="text-neutral-500 text-xl font-light">
              善用國家級轉型優惠，將合規成本轉化為企業獲利資產
            </p>
          </div>

          {/* Info: (20260212 - Luphia) Three Pillars */}
          <div className="grid grid-cols-3 gap-6 mb-8 flex-1">

            {/* Info: (20260212 - Luphia) Policy 1: Tax Credit */}
            <div className="group relative bg-neutral-900/40 border border-white/5 p-6 rounded-3xl backdrop-blur-xl hover:border-emerald-500/30 transition-all duration-500 flex flex-col">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Landmark className="text-emerald-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">產創條例 10-1</h3>
              <div className="text-emerald-500 font-mono text-xs mb-3">智慧機械與 AI 投資抵減</div>
              <p className="text-neutral-400 leading-relaxed text-xs mb-4 flex-1">
                導入 AI 智能會計系統，符合購置軟體支出抵減標準。可選擇當年度抵減 <span className="text-emerald-400 font-bold">5%</span> 或分三年抵減 <span className="text-emerald-400 font-bold">3%</span> 營所稅。
              </p>
              <ul className="space-y-2 text-[10px] text-neutral-500 mt-auto">
                <li className="flex items-center gap-2"><CheckCircle2 size={10} className="text-emerald-600" /> 直接降低系統建置成本</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={10} className="text-emerald-600" /> 符合數位轉型獎勵範疇</li>
              </ul>
            </div>

            {/* Info: (20260212 - Luphia) Policy 2: Subsidy */}
            <div className="group relative bg-neutral-900/40 border border-white/5 p-6 rounded-3xl backdrop-blur-xl hover:border-emerald-500/30 transition-all duration-500 flex flex-col">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Coins className="text-emerald-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">雙軸轉型補助</h3>
              <div className="text-emerald-500 font-mono text-xs mb-3">產業發展署/環境部專案</div>
              <p className="text-neutral-400 leading-relaxed text-xs mb-4 flex-1">
                對接「大帶小」或「數位轉型共好」補助方案。協助排碳大戶獲取政府專案支援，減輕系統導入之初期資金壓力。
              </p>
              <ul className="space-y-2 text-[10px] text-neutral-500 mt-auto">
                <li className="flex items-center gap-2"><CheckCircle2 size={10} className="text-emerald-600" /> 最高補助金額可達 $40,000+</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={10} className="text-emerald-600" /> 專屬供應鏈整合補貼</li>
              </ul>
            </div>

            {/* Info: (20260212 - Luphia) Policy 3: Carbon Fee Optimization */}
            <div className="group relative bg-emerald-500/[0.03] border border-emerald-500/20 p-6 rounded-3xl backdrop-blur-xl hover:border-emerald-500/40 transition-all duration-500 flex flex-col">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-4">
                <TrendingUp className="text-emerald-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">氣候法優惠費率</h3>
              <div className="text-emerald-500 font-mono text-xs mb-3">自主減量計畫標竿目標</div>
              <p className="text-neutral-400 leading-relaxed text-xs mb-4 flex-1">
                透過 AI 精準核算與模擬，協助企業達成「目標 A」，將碳費從 300 元降至 <span className="text-emerald-400 font-bold">50 元/噸</span>。
              </p>
              <ul className="space-y-2 text-[10px] text-neutral-500 mt-auto">
                <li className="flex items-center gap-2"><CheckCircle2 size={10} className="text-emerald-600" /> 節省高達 83% 碳費支出</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={10} className="text-emerald-600" /> 確保計畫書符合 SBTi 標準</li>
              </ul>
            </div>

          </div>

          {/* Info: (20260212 - Luphia) Summary Section: ROI */}
          <div className="mt-auto bg-neutral-900/60 border border-neutral-800 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="p-2 bg-white/5 rounded-xl border border-white/10">
                <Percent className="text-emerald-400" size={20} />
              </div>
              <div>
                <h4 className="text-base font-bold">綜合財務回報預估 (Strategic ROI)</h4>
                <p className="text-neutral-500 text-xs">結合租稅抵減與碳費節省，預計 12-18 個月內達成系統投資平衡點</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="px-4 py-2 bg-emerald-500 text-black font-bold rounded-lg flex items-center gap-2 hover:bg-emerald-400 transition-colors cursor-pointer text-xs">
                預約財務回報試算 <ArrowUpRight size={14} />
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
