import { Brain, TrendingUp, History, Lightbulb } from 'lucide-react';

export default function DeepReviewSlide5() {
  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4">
      {/* Info: (20260130 - Luphia) Container 1280x720 */}
      <div className="w-[1280px] h-[720px] bg-white relative overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-gray-200">
        {/* Info: (20260130 - Luphia) Background Gradients */}
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl pointer-events-none" aria-hidden="true">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[70rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff8c00] to-[#ffda44] opacity-20"
            style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} />
        </div>

        {/* Info: (20260130 - Luphia) Header */}
        <div className="absolute top-12 left-16 z-20">
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            DeepReview <span className="text-orange-600">議題管理</span>
          </h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-orange-500 to-amber-400 mt-4 rounded-full"></div>
        </div>

        {/* Info: (20260130 - Luphia) Browser Window Mockup */}
        <div className="z-10 mt-16 w-[1000px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col transform transition-transform hover:scale-[1.01] duration-500">
          {/* Info: (20260130 - Luphia) Browser Toolbar */}
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

          {/* Info: (20260130 - Luphia) App Content Mockup */}
          <div className="flex h-[450px]">
            {/* Info: (20260130 - Luphia) Left: Sidebar */}
            <div className="w-1/3 border-r border-gray-100 p-6 bg-gray-50/50 space-y-5 flex flex-col">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">焦點議題</div>
                <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="text-sm font-bold text-gray-800 mb-1">白銀通膨與技術替代</div>
                  <div className="text-[10px] text-gray-500">Ag Inflation & Tech Substitution</div>
                </div>
              </div>

              {/* Info: (20260130 - Luphia) Issue Tag */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">議題標籤</div>
                <div className="p-2.5 bg-orange-50 border border-orange-200 rounded text-orange-900 font-bold text-xs shadow-inner flex items-center gap-2">
                  <span className="text-orange-600">#</span>
                  鈣鈦礦光伏革命
                </div>
              </div>

              {/* Info: (20260131 - Luphia) Impact Detection */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">影響力檢測</div>
                <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-600">檢測日期</span>
                    <span className="text-[10px] font-mono text-gray-500">2026.01.31</span>
                  </div>
                  <div className="w-full h-px bg-gray-100"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-600">評分 0 - 100</span>
                    <span className="text-sm font-extrabold text-orange-600">92</span>
                  </div>
                </div>
              </div>

              <div className="flex-1"></div>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Brain size={14} className="text-blue-600" />
                  <span className="text-xs font-bold text-blue-800">AI Confidence</span>
                </div>
                <div className="text-3xl font-extrabold text-blue-600">92<span className="text-sm text-blue-400">/100</span></div>
              </div>
            </div>

            {/* Info: (20260130 - Luphia) Right: Insight Content */}
            <div className="flex-1 p-6 bg-white overflow-hidden relative flex flex-col">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                <Lightbulb size={300} />
              </div>

              {/* Info: (20260130 - Luphia) Title */}
              <div className="mb-4 border-b border-gray-100 pb-3">
                <h1 className="text-xl font-bold text-gray-900 leading-tight">百元白銀下的鈣鈦礦悖論，替代技術與崩跌暗湧</h1>
                <div className="text-[10px] text-gray-400 mt-1 font-mono">2026-01-31 | DeepInsight AI Analysis</div>
              </div>

              {/* Info: (20260130 - Luphia) Scrollable Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">

                {/* Info: (20260130 - Luphia) Main Analysis */}
                <div className="text-[11px] text-gray-700 leading-relaxed text-justify">
                  雖然工業需求看似旺盛，白銀的強勢正處於一個危險的技術臨界點。發展中的次世代鈣鈦礦電池將太陽能轉換率從 25% 大幅提升至 32%，但其與白銀之間存在著天然的化學排斥。鈣鈦礦中的鹵素離子會與銀發生氧化反應，生成的碘化銀導致電池效率迅速衰減。這種化學不相容性意味著白銀越貴，產業界就越有動力將其徹底踢出供應鏈。這是一場披著需求增長外衣，實則加速被替代的最後噴發。
                </div>

                {/* Info: (20260130 - Luphia) Actions */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-700 flex items-center gap-1 mb-2">
                    <TrendingUp size={12} /> 建議行動 STRATEGY
                  </div>
                  <ul className="space-y-2">
                    <li className="flex gap-2 items-start">
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded">做多</span>
                      <span className="text-[10px] text-gray-700 leading-tight">鎖定掌握銅電鍍 (Copper Plating) 或透明導電氧化物 (TCO) 技術的設備龍頭及材料商。</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded">減持</span>
                      <span className="text-[10px] text-gray-700 leading-tight">對依賴傳統高耗銀 TOPCon 技術且未布局鈣鈦礦轉型的企業進行戰略性減持。</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded">關注</span>
                      <span className="text-[10px] text-gray-700 leading-tight">關注具備封裝材料技術壁壘，如丁基膠、ALD 設備的供應鏈上游。</span>
                    </li>
                  </ul>
                </div>

                {/* Info: (20260130 - Luphia) ROI / Risks */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-green-50 border border-green-100 rounded-xl">
                    <div className="text-[9px] font-bold text-green-800 mb-1">回報期望值</div>
                    <div className="text-lg font-bold text-green-600">40% - 70%</div>
                    <div className="text-[9px] text-green-700 leading-tight mt-1">2026 下半年技術轉型潮爆發時，領先設備商潛在增長空間。</div>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                    <div className="text-[9px] font-bold text-red-800 mb-1">潛在風險</div>
                    <div className="text-[9px] text-red-700 leading-tight space-y-1">
                      <div>1. 鈣鈦礦量產良率若提升緩慢將延後商用。</div>
                      <div>2. 若銀價崩跌至 $50 以下將暫緩去銀化緊迫感。</div>
                    </div>
                  </div>
                </div>

                {/* Info: (20260130 - Luphia) Backtest */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-[10px] font-bold text-gray-600 flex items-center gap-1">
                      <History size={12} /> 信心回測
                    </div>
                    <div className="text-[9px] font-mono text-gray-400">Score: 82/100</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-500 leading-tight">
                    <div><span className="font-bold text-gray-700">化學數據:</span> 文獻證實 AgI 主導失效。</div>
                    <div><span className="font-bold text-gray-700">漲幅數據:</span> 銀價與組件報價連動一致。</div>
                    <div><span className="font-bold text-gray-700">技術數據:</span> 引用 NREL 與大廠數據無誤。</div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Info: (20260130 - Luphia) Footer */}
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
