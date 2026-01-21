import { Globe, Filter, Database, PenTool, CheckCircle, FileText, Clock, Zap, Award, TrendingUp } from 'lucide-react';

export default function DeepInsightSlide9() {
  const processSteps = [
    { id: 1, label: '國家熱點識別', icon: Globe },
    { id: 2, label: '輿情歸納', icon: Filter },
    { id: 3, label: '多源數據收集', icon: Database },
    { id: 4, label: '故事性敘事', icon: PenTool },
    { id: 5, label: '量化校正', icon: CheckCircle },
    { id: 6, label: '產出報告', icon: FileText },
  ];

  const benefits = [
    {
      title: '即時性',
      desc: '市場熱點反應速度達到分鐘級，搶佔資訊先機。',
      icon: Zap,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
    {
      title: '內容質量',
      desc: '結合故事性敘事與會計師專業，兼具深度與可讀性。',
      icon: Award,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
    },
    {
      title: '規模化',
      desc: '單一系統同時監控多國，人力需求不隨規模線性增長。',
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
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
        <div className="w-full px-16 pt-12 mb-8 relative z-20 text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            案例分析 — <span className="text-orange-600">MarketPulse 市場脈動</span>
          </h2>
          <p className="mt-3 text-xl text-gray-500 font-medium">市場熱點追蹤：超即時市場情報分析</p>
          <div className="h-1.5 w-24 bg-gradient-to-r from-orange-500 to-amber-400 mt-6 rounded-full mx-auto"></div>
        </div>

        {/* Info: (20260121 - Luphia) Main Layout */}
        <div className="w-full px-16 flex flex-col gap-8 z-10 flex-1">

          {/* Info: (20260121 - Luphia) 1. Process Flow & Time Highlight */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-lg p-8 relative overflow-hidden">
            <div className="flex justify-between items-start">
              {/* Info: (20260121 - Luphia) Process Steps */}
              <div className="flex-1 flex justify-between items-center relative mr-12 mt-4">
                {/* Info: (20260121 - Luphia) Connecting Line */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -z-10"></div>

                {processSteps.map((step) => (
                  <div key={step.id} className="flex flex-col items-center bg-white px-3 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-600 mb-3 shadow-sm hover:scale-110 transition-transform hover:border-orange-200 hover:text-orange-600">
                      <step.icon size={24} strokeWidth={1.5} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 whitespace-nowrap">{step.label}</span>
                  </div>
                ))}
              </div>

              {/* Info: (20260121 - Luphia) Time Metric */}
              <div className="flex flex-col items-center justify-center pl-8 border-l border-gray-100">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-red-500 border-4 border-white flex flex-col items-center justify-center text-white shadow-xl animate-pulse">
                  <Clock size={24} className="mb-1" />
                  <span className="text-sm font-bold leading-none">15-20</span>
                  <span className="text-[10px] opacity-90">min</span>
                </div>
                <div className="mt-2 text-sm font-bold text-orange-600">分鐘級響應</div>
              </div>
            </div>
          </div>

          {/* Info: (20260121 - Luphia) 2. Benefit Pillars */}
          <div className="grid grid-cols-3 gap-6">
            {benefits.map((b, i) => (
              <div key={i} className={`bg-white rounded-2xl shadow-md border ${b.border} p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl ${b.bg} ${b.color} flex items-center justify-center`}>
                    <b.icon size={24} strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{b.title}</h3>
                </div>
                <p className="text-gray-600 leading-relaxed text-justify font-medium">
                  {b.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Info: (20260121 - Luphia) Qualitative Tagline */}
          <div className="bg-slate-900 rounded-xl p-4 text-center text-white/90 text-sm tracking-wide font-medium">
            全自動市場情報系統，解放高價值人力，掌握即時動態。
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
