import { Layout, CheckCircle2, Search, Brain, Globe, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';

export default function DeepInsightSlide6() {
  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4">
      {/* Info: (20260121 - Luphia) Container 1280x720 */}
      <div className="w-[1280px] h-[720px] bg-white relative overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-gray-200">
        {/* Info: (20260121 - Luphia) Background Gradients */}
        <div
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[70rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff8c00] to-[#ffda44] opacity-20"
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>

        <div
          className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[70rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff8c00] to-[#ffda44] opacity-20"
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>

        {/* Info: (20260121 - Luphia) Header */}
        <div className="absolute top-12 left-16 z-20">
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            快速展示 <span className="text-orange-600">MarketPulse</span>
          </h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-orange-500 to-amber-400 mt-4 rounded-full"></div>
        </div>

        {/* Info: (20260121 - Luphia) Browser Window Mockup */}
        <div className="z-10 mt-16 w-[1000px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col transform transition-transform hover:scale-[1.01] duration-500">
          {/* Info: (20260121 - Luphia) Browser Toolbar */}
          <div className="h-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200 flex items-center px-4 gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm"></div>
              <div className="w-3 h-3 rounded-full bg-green-400 shadow-sm"></div>
            </div>
            <div className="ml-4 flex-1 bg-white h-7 rounded-md border border-gray-200 flex items-center px-3 text-xs text-gray-400 font-medium">
              https://isunfa.com/user/analysis
            </div>
          </div>

          {/* Info: (20260121 - Luphia) App Content Mockup */}
          <div className="flex h-[450px]">
            {/* Info: (20260121 - Luphia) Left: Sidebar / Input */}
            <div className="w-1/3 border-r border-gray-100 p-6 bg-gray-50/50 space-y-5 flex flex-col">
              {/* Info: (20260121 - Luphia) Tabs */}
              <div className="flex gap-2 p-1 bg-gray-200/50 rounded-lg">
                <div className="flex-1 py-1.5 text-center text-xs font-medium text-gray-500">內部分析</div>
                <div className="flex-1 py-1.5 bg-white shadow-sm rounded text-center text-xs font-bold text-gray-800">外部洞察</div>
              </div>

              {/* Info: (20260121 - Luphia) Country */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">國家/市場</div>
                <div className="flex gap-2">
                  <div className="px-3 py-1.5 bg-orange-600 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm">
                    <Globe size={12} /> ALL
                  </div>
                  <div className="px-3 py-1.5 bg-white border border-gray-200 text-gray-400 rounded text-xs">USA</div>
                  <div className="px-3 py-1.5 bg-white border border-gray-200 text-gray-400 rounded text-xs">TWN</div>
                  <div className="px-3 py-1.5 bg-white border border-gray-200 text-gray-400 rounded text-xs">JPN</div>
                </div>
              </div>

              {/* Info: (20260121 - Luphia) Category */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">分析類別</div>
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex justify-between items-center cursor-pointer shadow-sm">
                  <span className="text-sm font-bold text-orange-800">市場脈動</span>
                  <CheckCircle2 size={16} className="text-orange-600" />
                </div>
              </div>

              {/* Info: (20260121 - Luphia) Confidence */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">信心區間</div>
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                  <div className="flex-1 py-1.5 bg-white shadow-sm text-center text-xs font-bold text-orange-600 rounded">高</div>
                  <div className="flex-1 py-1.5 text-center text-xs text-gray-400">中</div>
                  <div className="flex-1 py-1.5 text-center text-xs text-gray-400">低</div>
                </div>
              </div>

              <div className="flex-1"></div>

              <button className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-lg font-bold shadow-lg shadow-orange-200 text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                <Search size={14} strokeWidth={2.5} />
                開始分析 GENERATE
              </button>
            </div>

            {/* Info: (20260121 - Luphia) Right: Report Output */}
            <div className="flex-1 p-6 bg-white overflow-hidden relative flex flex-col">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                <Layout size={300} />
              </div>

              {/* Info: (20260121 - Luphia) Report Header */}
              <div className="mb-4 border-b border-gray-100 pb-3 flex-shrink-0">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xl font-bold text-gray-900 leading-tight">當 AI 金礦變成了無底錢坑 - 微軟 (MSFT)</div>
                    <div className="text-[10px] text-gray-400 mt-1 font-mono">ID: MARKET-PULSE-MSFT | 2026-01-30 09:15 EST</div>
                  </div>
                  <div className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded border border-red-100 flex items-center gap-1">
                    <AlertTriangle size={10} /> CRITICAL
                  </div>
                </div>
              </div>

              {/* Report Body: Scrollable */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {/* Intro Text */}
                <p className="text-[11px] text-gray-600 mb-4 leading-relaxed font-medium">
                  2026 年 1 月 29 日，微軟發布了優於預期的財報，但華爾街卻給出殘酷回應：股價重挫近 10%，市值蒸發 3,570 億美元。這是自 2025 年 Nvidia 慘案後美股史上第二大單日市值損失，標誌著市場對 AI 資本支出回報的耐心已至極限。
                </p>

                <div className="flex gap-4 mb-4">
                  {/* Quantitative Metrics */}
                  <div className="flex-1 space-y-2">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">關鍵量化指標</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-red-50 rounded border border-red-100">
                        <div className="text-[10px] text-gray-500">單日市值蒸發</div>
                        <div className="text-sm font-bold text-red-600">-$3,570B</div>
                      </div>
                      <div className="p-2 bg-orange-50 rounded border border-orange-100">
                        <div className="text-[10px] text-gray-500">資本支出 (Capex)</div>
                        <div className="text-sm font-bold text-orange-600">$375B <span className="text-[9px] font-normal text-gray-400">(+66%)</span></div>
                      </div>
                      <div className="p-2 bg-gray-50 rounded border border-gray-100">
                        <div className="text-[10px] text-gray-500">Azure 營收成長</div>
                        <div className="text-sm font-bold text-gray-700">39% <span className="text-[9px] font-normal text-red-400">(-1%)</span></div>
                      </div>
                      <div className="p-2 bg-blue-50 rounded border border-blue-100">
                        <div className="text-[10px] text-gray-500">剩餘履約義務</div>
                        <div className="text-sm font-bold text-blue-600">$6,250B <span className="text-[9px] font-normal text-gray-400">(45% OpenAI)</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Qualitative Metrics */}
                  <div className="flex-1 space-y-2">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">關鍵質化指標</div>
                    <div className="space-y-1.5">
                      <div className="flex gap-2 items-start">
                        <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0"></div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-800">產能瓶頸的雙面刃</div>
                          <div className="text-[9px] text-gray-500 leading-tight">供給趕不上需求，正因算力不足將客戶拱手讓人。</div>
                        </div>
                      </div>
                      <div className="flex gap-2 items-start">
                        <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0"></div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-800">軟體護城河侵蝕</div>
                          <div className="text-[9px] text-gray-500 leading-tight">AI Agent 普及恐削弱 SaaS 議價能力。</div>
                        </div>
                      </div>
                      <div className="flex gap-2 items-start">
                        <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0"></div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-800">短壽命資產折舊</div>
                          <div className="text-[9px] text-gray-500 leading-tight">GPU 更新極快，若無高利潤轉化將重壓毛利。</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Suggested Actions Box */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                      <Brain size={12} /> 建議行動 ACTIONS
                    </div>
                    <div className="text-[9px] font-mono text-slate-400">Confidence: 85/100</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div className="p-2 bg-white rounded border border-slate-100 shadow-sm">
                      <div className="text-[9px] text-slate-500 font-bold mb-0.5">長期投資 (Long)</div>
                      <div className="text-[10px] text-slate-700 leading-tight">等待回測 200MA ($410-420) 分批佈局，核心競爭力仍在。</div>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-100 shadow-sm">
                      <div className="text-[9px] text-slate-500 font-bold mb-0.5">短期交易 (Short/Rotate)</div>
                      <div className="text-[10px] text-slate-700 leading-tight">避開軟體，轉向能源/電力基礎設施 (AI 的盡頭是電力)。</div>
                    </div>
                  </div>
                  {/* ROI / Risk Bar */}
                  <div className="flex gap-2 mt-1 pt-2 border-t border-slate-200/50">
                    <div className="flex-1 flex justify-between items-center px-2">
                      <span className="text-[9px] text-green-600 font-bold flex items-center gap-1"><TrendingUp size={10} /> Exp. Return</span>
                      <span className="text-[10px] font-bold text-green-700">+15% ~ +20%</span>
                    </div>
                    <div className="w-px bg-slate-200 h-3"></div>
                    <div className="flex-1 flex justify-between items-center px-2">
                      <span className="text-[9px] text-red-500 font-bold flex items-center gap-1"><TrendingDown size={10} /> Max Risk</span>
                      <span className="text-[10px] font-bold text-red-600">-12% ~ -18%</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>

        {/* Info: (20260121 - Luphia) Footer */}
        <div className="absolute bottom-4 w-full px-16 flex justify-between text-gray-400 text-xs tracking-widest uppercase font-medium">
          <div>Confidential</div>
          <div className="flex gap-2 items-center">
            <div className="w-2 h-2 rounded-full bg-orange-400"></div>
            2026 CAFECA Fintech
          </div>
        </div>
      </div>
    </div>
  );
}
