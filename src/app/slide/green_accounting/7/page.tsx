'use client';

import { NotebookPen, MonitorCheck, Sparkles, TrendingUp, HandCoins, FileText } from 'lucide-react';

export default function GreenAccountingSlide7() {
  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-4 font-sans">
      <div className="w-[1280px] h-[720px] bg-neutral-950 relative overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-neutral-800 text-white">

        {/* Info: (20260212 - Luphia) Background: Subtle Tech Glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-[20%] w-[60%] h-[60%] bg-emerald-900/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 right-[20%] w-[50%] h-[50%] bg-teal-900/10 blur-[100px] rounded-full" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none"></div>
        </div>

        <div className="z-10 w-full max-w-6xl px-12 flex flex-col h-full py-12">

          {/* Info: (20260212 - Luphia) Title Section */}
          <div className="mb-12 text-center space-y-4">
            <h2 className="text-5xl font-extrabold tracking-tight text-white">
              財務自動化：讓 AI 成為您的專屬會計助理
            </h2>
            <div className="h-1 w-32 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mx-auto mt-6" />
          </div>

          {/* Info: (20260212 - Luphia) Two Main Columns */}
          <div className="grid grid-cols-2 gap-12 flex-1 items-center px-8">

            {/* Info: (20260212 - Luphia) Left Card: Auto Bookkeeping */}
            <div className="group relative bg-neutral-900/40 border border-white/10 p-8 rounded-3xl h-full backdrop-blur-xl hover:border-emerald-500/50 hover:bg-neutral-900/60 transition-all duration-500 flex flex-col">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                  <NotebookPen className="text-emerald-400 w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">自動記帳</h3>
                  <span className="text-emerald-500 font-mono text-sm">(AI Bookkeeping)</span>
                </div>
              </div>

              <div className="space-y-6 flex-1">
                <div className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2.5 shrink-0" />
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">功能：</h4>
                    <p className="text-neutral-400 leading-relaxed">
                      透過 AI 學習歷史分錄習慣，自動識別憑證並切立傳票。
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2.5 shrink-0" />
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">效益：</h4>
                    <p className="text-neutral-400 leading-relaxed">
                      <span className="text-emerald-400 font-bold">節省 70% 資料登打時間</span>，讓財務人員專注於審核與分析。
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex gap-4 text-xs text-neutral-500 font-mono">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-emerald-500/70" />
                  <span>SMART_OCR</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <HandCoins className="w-3 h-3 text-emerald-500/70" />
                  <span>AUTO_ENTRY</span>
                </div>
              </div>
            </div>

            {/* Info: (20260212 - Luphia) Right Card: Financial Reports */}
            <div className="group relative bg-neutral-900/40 border border-white/10 p-8 rounded-3xl h-full backdrop-blur-xl hover:border-emerald-500/50 hover:bg-neutral-900/60 transition-all duration-500 flex flex-col">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                  <MonitorCheck className="text-emerald-400 w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">會計報表</h3>
                  <span className="text-emerald-500 font-mono text-sm">(Financial Reports)</span>
                </div>
              </div>

              <div className="space-y-6 flex-1">
                <div className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2.5 shrink-0" />
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">功能：</h4>
                    <p className="text-neutral-400 leading-relaxed">
                      即時產出三大財務報表。<br />
                      (資產負債表、損益表、現金流量表)
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2.5 shrink-0" />
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">效益：</h4>
                    <p className="text-neutral-400 leading-relaxed">
                      決策不再憑感覺，隨時掌握公司現金流與獲利能力，<span className="text-emerald-400 font-bold">滿足銀行融資需求</span>。
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex gap-4 text-xs text-neutral-500 font-mono">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-emerald-500/70" />
                  <span>REALTIME_REPORT</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-emerald-500/70" />
                  <span>CASHFLOW_INSIGHT</span>
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
