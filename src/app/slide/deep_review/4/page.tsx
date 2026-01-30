import { Brain, ClipboardCheck, Target } from 'lucide-react';

export default function DeepReviewSlide4() {
  const solutions = [
    {
      id: 1,
      title: 'AI 驅動深度分析',
      subtitle: 'Intelligent Generation',
      desc: '結合 <span class="font-bold text-gray-800">RPA</span> 定期針對上千個金融商品分析其表現，同時尋找上場競品分析比對，寄出報告給相關委員，化被動為依據數據的主動監控。',
      icon: Brain,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    },
    {
      id: 2,
      title: '自動化流程與協作',
      subtitle: 'Seamless Process',
      desc: '整合 <span class="font-bold text-gray-800">生物辨識技術</span> 簡化簽核流程，<span class="font-bold text-gray-800">智能會議助理</span> 隨時錄音解析會議逐字稿、匯總意見，大幅降低行政作業成本。',
      icon: ClipboardCheck,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
    },
    {
      id: 3,
      title: '市場動態即時對接',
      subtitle: 'Dynamic Insight',
      desc: '即時分析市場輿情捕捉熱點，透過 <span class="font-bold text-gray-800">動態標籤系統</span> 進行即時標示與分類，確保商品與投資主題精準配對，搶佔市場先機。',
      icon: Target,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
    },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4">
      {/* Info: (20260121 - Luphia) Container 1280x720 */}
      <div className="w-[1280px] h-[720px] bg-white relative overflow-hidden shadow-2xl flex flex-col items-center border border-gray-200">
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
        <div className="w-full px-16 pt-16 mb-12 relative z-20 text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            DeepReview <span className="text-orange-600">解決方案</span>
          </h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-orange-500 to-amber-400 mt-6 rounded-full mx-auto"></div>
        </div>

        {/* Info: (20260121 - Luphia) Solution Cards */}
        <div className="w-full px-20 grid grid-cols-3 gap-8 z-10">
          {solutions.map((sol) => (
            <div
              key={sol.id}
              className={`bg-white rounded-3xl shadow-xl border ${sol.border} p-8 flex flex-col items-center text-center h-[420px] hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden`}
            >
              {/* Info: (20260121 - Luphia) Icon */}
              <div className={`w-20 h-20 rounded-2xl ${sol.bg} flex items-center justify-center ${sol.color} mb-6 shadow-inner group-hover:scale-110 transition-transform duration-300 z-10`}>
                <sol.icon size={40} strokeWidth={1.5} />
              </div>

              {/* Info: (20260121 - Luphia) Title */}
              <h3 className="text-2xl font-bold text-gray-900 mb-1 z-10">{sol.title}</h3>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 z-10">{sol.subtitle}</div>

              {/* Info: (20260121 - Luphia) Description */}
              <p className="text-gray-600 leading-relaxed font-medium text-justify text-sm z-10" dangerouslySetInnerHTML={{ __html: sol.desc }}></p>

              {/* Info: (20260121 - Luphia) Decorative Background Icon */}
              <div className="absolute -bottom-8 -right-8 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity duration-500 z-0">
                <sol.icon size={180} />
              </div>
            </div>
          ))}
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
