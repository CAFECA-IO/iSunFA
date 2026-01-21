import Image from 'next/image';
import { Layout, CheckCircle2, Search, Brain, Globe } from 'lucide-react';

export default function DeepInsightSlide3() {
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
            快速展示 <span className="text-orange-600">DeepInsight</span>
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
                    <Globe size={12} /> TWN
                  </div>
                  <div className="px-3 py-1.5 bg-white border border-gray-200 text-gray-400 rounded text-xs">USA</div>
                  <div className="px-3 py-1.5 bg-white border border-gray-200 text-gray-400 rounded text-xs">JPN</div>
                </div>
              </div>

              {/* Info: (20260121 - Luphia) Category */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">分析類別</div>
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex justify-between items-center cursor-pointer shadow-sm">
                  <span className="text-sm font-bold text-orange-800">智能企業評級</span>
                  <CheckCircle2 size={16} className="text-orange-600" />
                </div>
              </div>

              {/* Info: (20260121 - Luphia) Keyword */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">關鍵字 / 代碼</div>
                <div className="p-2.5 bg-white border border-gray-300 rounded text-gray-900 font-bold text-sm shadow-inner flex items-center gap-2">
                  <Search size={14} className="text-gray-400" />
                  2330
                </div>
              </div>

              <div className="flex-1"></div>

              <button className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-lg font-bold shadow-lg shadow-orange-200 text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                <Search size={14} strokeWidth={2.5} />
                開始分析 GENERATE
              </button>
            </div>

            {/* Info: (20260121 - Luphia) Right: Report Output */}
            <div className="flex-1 p-8 bg-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                <Layout size={300} />
              </div>

              {/* Info: (20260121 - Luphia) Report Header */}
              <div className="mb-6 border-b border-gray-100 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">台積電 (2330.TW) 智能投資評級</div>
                    <div className="text-xs text-gray-400 mt-1 font-mono">ID: F08EB0-TSMC | 2026-01-21 18:30</div>
                  </div>
                  <div className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded border border-blue-200">
                    AI GENERATED
                  </div>
                </div>
              </div>

              {/* Info: (20260121 - Luphia) Report Content: Radar + Metrics */}
              <div className="flex gap-6 h-[220px]">
                {/* Info: (20260121 - Luphia) Left: Radar Chart */}
                <div className="w-[45%] flex flex-col items-center justify-center relative">
                  <div className="relative w-full h-full">
                    <Image
                      src={`/charts/radar?c=${encodeURIComponent(JSON.stringify({
                        type: 'radar',
                        data: {
                          labels: ['ECQ', 'MMP', 'UEE', 'GDI', 'TPM', 'SRR', 'ERE', 'GES'],
                          datasets: [{
                            label: 'TSMC',
                            data: [85.5, 93.0, 79.0, 95.0, 82.0, 76.5, 79.0, 90.0],
                            backgroundColor: 'rgba(249, 115, 22, 0.2)',
                            borderColor: 'rgba(249, 115, 22, 1)',
                            borderWidth: 2
                          }]
                        },
                        options: {
                          scales: {
                            r: { min: 0, max: 100, ticks: { display: false } }
                          }
                        }
                      }))}`}
                      alt="Radar Chart"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <div className="absolute top-0 left-0 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100 shadow-sm z-10">
                    綜合評分: 96
                  </div>
                </div>

                {/* Info: (20260121 - Luphia) Right: Metrics Details */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                  {[
                    { label: 'ECQ (獲利品質)', score: 85.5, desc: '獲利含金量極高，現金流強勁，財務結構穩健。' },
                    { label: 'MMP (護城河)', score: 93.0, desc: '在先進製程領域擁有近乎壟斷的地位。' },
                    { label: 'UEE (經營效率)', score: 79.0, desc: '營運效率卓越，毛利率處於行業頂尖水平。' },
                    { label: 'GDI (公司治理)', score: 95.0, desc: '公司治理與資訊透明度堪稱業界典範。' },
                    { label: 'TPM (技術動能)', score: 82.0, desc: '穩坐AI趨勢順風車，先進製程路線圖清晰。' },
                    { label: 'SRR (永續與法規)', score: 76.5, desc: '永續目標明確，客戶集中為潛在風險。' },
                    { label: 'ERE (外部韌性)', score: 79.0, desc: '財務韌性強，但地緣政治為最大挑戰。' },
                    { label: 'GES (成長與估值)', score: 90.0, desc: '受益於AI趨勢，增長前景清晰。' }
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col gap-0.5 p-1.5 rounded-lg bg-gray-50 border border-gray-100 hover:bg-orange-50 hover:border-orange-200 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-800">{item.label}</span>
                        <span className={`text-[10px] font-bold ${item.score >= 90 ? 'text-green-600' : item.score >= 80 ? 'text-blue-600' : 'text-orange-600'}`}>
                          {item.score}
                        </span>
                      </div>
                      <div className="text-[9px] text-gray-500 leading-tight">
                        {item.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info: (20260121 - Luphia) AI Insight Box */}
              <div className="mt-4 p-3 bg-orange-50/40 rounded-xl border border-orange-100/60">
                <div className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2">
                  <Brain size={16} />
                  DeepInsight 智能總結
                </div>
                <div className="text-xs text-gray-700 leading-relaxed text-justify">
                  受惠於 <span className="font-bold text-gray-900">AI 高速運算需求強勁</span>，先進製程 (3nm) 營收佔比顯著提升，預期未來三季毛利率將維持高檔。自由現金流充沛，具備極佳的抗風險能力。技術領先優勢持續擴大，建議評級為 <span className="font-bold text-orange-700">強力買入 (Strong Buy)</span>，目標價上調。
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
            2026 iSunFA Corp.
          </div>
        </div>
      </div>
    </div>
  );
}
