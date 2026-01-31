import { User, Brain, Bot, Sparkles, RefreshCw, FileText, ShieldCheck, ArrowRight } from 'lucide-react';

export default function DeepReviewSlide11() {
  const steps = [
    {
      id: '01',
      title: '需求輸入',
      desc: '用戶簡述報告需求，定義分析目標與範圍。',
      icon: User,
      color: 'bg-gray-100 text-gray-600',
    },
    {
      id: '02',
      title: '策略拆解',
      desc: 'FAITH 制定量化策略，將大目標分解可執行任務。',
      icon: Brain,
      color: 'bg-orange-50 text-orange-600',
      highlight: true,
    },
    {
      id: '03',
      title: '代理執行',
      desc: 'AICH 領取任務，執行爬蟲與資料庫探索並回報。',
      icon: Bot,
      color: 'bg-blue-50 text-blue-600',
      highlight: true,
    },
    {
      id: '04',
      title: '數據清洗',
      desc: '針對回報進行標準化處理，確保數據品質。',
      icon: Sparkles,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      id: '05',
      title: '循環迭代',
      desc: '重複執行與清洗，確保資料完整性與深度。',
      icon: RefreshCw,
      color: 'bg-green-50 text-green-600',
    },
    {
      id: '06',
      title: '報告生成',
      desc: 'FAITH 整合成果，生成結構化且具專業邏輯報告。',
      icon: FileText,
      color: 'bg-orange-50 text-orange-600',
      highlight: true,
    },
    {
      id: '07',
      title: '準確驗證',
      desc: '透過 AI Agent 進行回測，驗證結果可靠性。',
      icon: ShieldCheck,
      color: 'bg-red-50 text-red-600',
    },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4">
      {/* Info: (20260130 - Luphia) Container 1280x720 */}
      <div className="w-[1280px] h-[720px] bg-white relative overflow-hidden shadow-2xl flex flex-col items-center border border-gray-200">
        {/* Info: (20260130 - Luphia) Background Gradients */}
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

        {/* Info: (20260130 - Luphia) Header */}
        <div className="w-full px-16 pt-12 mb-10 relative z-20 text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            DeepReview <span className="text-orange-600">運作流程</span>
          </h2>
          <p className="mt-3 text-xl text-gray-500 font-medium">從需求到洞察的 7 個關鍵步驟</p>
          <div className="h-1.5 w-24 bg-gradient-to-r from-orange-500 to-amber-400 mt-6 rounded-full mx-auto"></div>
        </div>

        {/* Info: (20260130 - Luphia) Steps Flow Container */}
        <div className="w-full px-8 flex flex-col gap-12 z-10">
          {/* Info: (20260130 - Luphia) Row 1: Steps 1-4 */}
          <div className="flex justify-center items-stretch gap-6">
            {steps.slice(0, 4).map((step, index) => (
              <div key={step.id} className="flex items-center gap-2">
                {/* Info: (20260130 - Luphia) Card */}
                <div className="flex flex-col items-center w-[180px] group relative">
                  {/* Info: (20260130 - Luphia) Number Bubble */}
                  <div className="mb-4 relative z-20">
                    <div className={`w-14 h-14 rounded-2xl ${step.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 border-2 border-white relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <step.icon size={28} strokeWidth={1.5} />
                    </div>
                    <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold border-2 border-white shadow-md z-30">
                      {step.id}
                    </div>
                  </div>

                  {/* Info: (20260130 - Luphia) Content */}
                  <div className={`text-center bg-white/90 backdrop-blur-md p-5 pt-8 -mt-6 rounded-2xl border ${step.highlight ? 'border-orange-200 shadow-orange-100' : 'border-gray-100'} shadow-lg h-[150px] w-full hover:shadow-xl transition-all hover:-translate-y-1 relative z-10 flex flex-col items-center`}>
                    {step.highlight && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>
                    )}
                    <h3 className={`text-lg font-bold mb-3 ${step.highlight ? 'text-orange-700' : 'text-gray-900'}`}>
                      {step.title}
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed text-justify font-medium">
                      {step.desc}
                    </p>
                  </div>
                </div>

                {/* Info: (20260130 - Luphia) Connector Arrow (Right) except for last item in row */}
                {index < 3 && (
                  <div className="pt-12 text-gray-300 transform -translate-x-1">
                    <ArrowRight size={20} className="text-gray-300/60" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Info: (20260130 - Luphia) Row 2: Steps 5-7 */}
          <div className="flex justify-center items-stretch gap-6 pl-12">
            {steps.slice(4, 7).map((step, index) => (
              <div key={step.id} className="flex items-center gap-2">
                {/* Info: (20260130 - Luphia) Card */}
                <div className="flex flex-col items-center w-[180px] group relative">
                  {/* Info: (20260130 - Luphia) Number Bubble */}
                  <div className="mb-4 relative z-20">
                    <div className={`w-14 h-14 rounded-2xl ${step.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 border-2 border-white relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <step.icon size={28} strokeWidth={1.5} />
                    </div>
                    <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold border-2 border-white shadow-md z-30">
                      {step.id}
                    </div>
                  </div>

                  {/* Info: (20260130 - Luphia) Content */}
                  <div className={`text-center bg-white/90 backdrop-blur-md p-5 pt-8 -mt-6 rounded-2xl border ${step.highlight ? 'border-orange-200 shadow-orange-100' : 'border-gray-100'} shadow-lg h-[150px] w-full hover:shadow-xl transition-all hover:-translate-y-1 relative z-10 flex flex-col items-center`}>
                    {step.highlight && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>
                    )}
                    <h3 className={`text-lg font-bold mb-3 ${step.highlight ? 'text-orange-700' : 'text-gray-900'}`}>
                      {step.title}
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed text-justify font-medium">
                      {step.desc}
                    </p>
                  </div>
                </div>

                {/* Info: (20260130 - Luphia) Connector Arrow (Right) except for last item */}
                {index < 2 && (
                  <div className="pt-12 text-gray-300 transform -translate-x-1">
                    <ArrowRight size={20} className="text-gray-300/60" />
                  </div>
                )}
              </div>
            ))}
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
