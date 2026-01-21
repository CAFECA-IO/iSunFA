
import { Search, Database, BarChart3, FileText, Clock, Zap, Layers, PiggyBank } from 'lucide-react';

export default function DeepInsightSlide7() {
  const processSteps = [
    { id: 1, label: '識別標的', icon: Search },
    { id: 2, label: '多源爬蟲', icon: Database },
    { id: 3, label: '指標分析', icon: BarChart3 },
    { id: 4, label: '報告整合', icon: FileText },
  ];

  const metrics = [
    {
      value: '95%',
      label: '節省時間',
      desc: '較傳統人工收集資料縮短 95% 以上時間',
      icon: Zap,
      color: 'text-yellow-500',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
    },
    {
      value: '10+',
      label: '涵蓋廣度',
      desc: '納入司法判決、政府補助等非傳統財報數據',
      icon: Layers,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    },
    {
      value: '80%',
      label: '成本降低',
      desc: '降低約 80% 的初級分析師作業負擔',
      icon: PiggyBank,
      color: 'text-green-500',
      bg: 'bg-green-50',
      border: 'border-green-200',
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

        {/* Info: (20260121 - Luphia)Header */}
        <div className="w-full px-16 pt-12 mb-8 relative z-20 text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            案例分析 — <span className="text-orange-600">IRSC 智能企業評級</span>
          </h2>
          <p className="mt-3 text-xl text-gray-500 font-medium">單一企業深度挖掘：15-20 分鐘完成專業評級</p>
          <div className="h-1.5 w-24 bg-gradient-to-r from-orange-500 to-amber-400 mt-6 rounded-full mx-auto"></div>
        </div>

        {/* Info: (20260121 - Luphia) Main Layout: Top (Process) + Bottom (Metrics) */}
        <div className="w-full px-16 flex flex-col gap-8 z-10 flex-1">

          {/* Info: (20260121 - Luphia) 1. Process Flow & Qualitative Benefit */}
          <div className="flex gap-8 h-[220px]">
            {/* Info: (20260121 - Luphia) Process Steps */}
            <div className="flex-1 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-lg p-6 flex flex-col justify-center">
              <div className="flex justify-between items-center relative">
                {/* Info: (20260121 - Luphia) Connecting Line */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -z-10"></div>

                {processSteps.map((step) => (
                  <div key={step.id} className="flex flex-col items-center bg-white px-2">
                    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 mb-2 shadow-sm">
                      <step.icon size={20} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">{step.label}</span>
                  </div>
                ))}

                {/* Info: (20260121 - Luphia) Time Highlight */}
                <div className="flex flex-col items-center bg-white px-2 relative -top-8">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 border-4 border-white flex flex-col items-center justify-center text-white shadow-xl animate-pulse">
                    <Clock size={20} className="mb-1" />
                    <span className="text-xs font-bold leading-none">15-20</span>
                    <span className="text-[10px] opacity-80">min</span>
                  </div>
                  <div className="mt-2 text-sm font-bold text-orange-600">生成時間</div>
                </div>
              </div>
            </div>

            {/* Info: (20260121 - Luphia) Qualitative Benefit */}
            <div className="w-[350px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-xl p-6 flex flex-col justify-center text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <BarChart3 size={120} />
              </div>
              <h3 className="text-lg font-bold text-orange-400 mb-3 flex items-center gap-2">
                <Zap size={20} />
                質化效益
              </h3>
              <p className="text-slate-300 leading-relaxed text-justify text-sm">
                即時分析獲利與償債能力，提供精準投資建議，大幅縮短決策週期。
              </p>
            </div>
          </div>

          {/* Info: (20260121 - Luphia) 2. Metrics Grid */}
          <div className="grid grid-cols-3 gap-6">
            {metrics.map((m, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex items-center gap-6 hover:-translate-y-1 transition-transform duration-300">
                <div className={`w-20 h-20 rounded-2xl ${m.bg} flex items-center justify-center ${m.color} shadow-inner`}>
                  <m.icon size={36} strokeWidth={1.5} />
                </div>
                <div>
                  <div className={`text-4xl font-extrabold ${m.color} tracking-tight`}>{m.value}</div>
                  <div className="text-lg font-bold text-gray-800 mb-1">{m.label}</div>
                  <div className="text-xs text-gray-500">{m.desc}</div>
                </div>
              </div>
            ))}
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
