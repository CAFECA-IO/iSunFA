import { Target, FileCode, Binary, TrendingUp, Rocket } from 'lucide-react';

export default function DeepReviewSlide12() {
  const steps = [
    {
      id: '01',
      title: '需求設定',
      sub: 'Requirement Setting',
      desc: '定義目標市場與分析範疇',
      icon: Target,
      color: 'bg-gray-100 text-gray-600',
      gradient: 'from-gray-700 to-slate-500',
    },
    {
      id: '02',
      title: '模板生成',
      sub: 'Template Generation',
      desc: '產出任務執行策略模板與參數',
      icon: FileCode,
      color: 'bg-orange-50 text-orange-600',
      gradient: 'from-orange-600 to-amber-500',
    },
    {
      id: '03',
      title: '策略量化',
      sub: 'Strategy Quantification',
      desc: '將分析指標轉化為可執行的量化邏輯',
      icon: Binary,
      color: 'bg-blue-50 text-blue-600',
      gradient: 'from-blue-600 to-cyan-500',
    },
    {
      id: '04',
      title: '回測優化',
      sub: 'Backtest Optimization',
      desc: '進行試運行，根據回測結果調整策略',
      icon: TrendingUp,
      color: 'bg-purple-50 text-purple-600',
      gradient: 'from-purple-600 to-pink-500',
    },
    {
      id: '05',
      title: '完成訓練',
      sub: 'Training Completion',
      desc: '正式完成代理人訓練並上線',
      icon: Rocket,
      color: 'bg-green-50 text-green-600',
      highlight: true,
      gradient: 'from-green-600 to-emerald-500',
    },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4">
      {/* Info: (20260131 - Luphia) Container 1280x720 */}
      <div className="w-[1280px] h-[720px] bg-white relative overflow-hidden shadow-2xl flex flex-col items-center border border-gray-200">
        {/* Info: (20260131 - Luphia) Background Gradients */}
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

        {/* Info: (20260131 - Luphia) Header */}
        <div className="w-full px-16 pt-16 mb-16 relative z-20">
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            部署與 <span className="text-orange-600">策略導入</span>
          </h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-orange-500 to-amber-400 mt-4 rounded-full"></div>
          <p className="mt-4 text-xl text-gray-500 font-medium">Deployment & Strategy Implementation</p>
        </div>

        {/* Info: (20260131 - Luphia) Timeline / Roadmap Container */}
        <div className="w-full px-16 relative z-10 flex flex-col justify-center h-[350px]">
          {/* Info: (20260131 - Luphia) Connection Line */}
          <div className="absolute top-1/2 left-24 right-24 h-1 bg-gray-100 -translate-y-[80px] z-0"></div>

          <div className="flex justify-between items-start relative z-10">
            {steps.map((step) => (
              <div key={step.id} className="flex flex-col items-center w-[200px] group">
                {/* Info: (20260131 - Luphia) Icon Circle */}
                <div className={`w-20 h-20 rounded-full ${step.color} border-4 border-white shadow-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 relative bg-white`}>
                  <step.icon size={32} strokeWidth={2} />
                  {step.highlight && (
                    <div className="absolute inset-0 rounded-full border-4 border-orange-400 opacity-30 animate-ping"></div>
                  )}
                </div>

                {/* Info: (20260131 - Luphia) Content Card with Connector */}
                <div className="relative">
                  {/* Info: (20260131 - Luphia) Triangle Connector pointing up to the line/circle */}
                  <div className="absolute left-1/2 -top-2 -translate-x-1/2 w-4 h-4 bg-white transform rotate-45 border-t border-l border-gray-100 z-20"></div>

                  <div className="mt-2 bg-white/80 backdrop-blur-sm border border-gray-100 shadow-lg rounded-xl p-5 text-center transition-all hover:-translate-y-1 hover:shadow-xl hover:border-orange-100">
                    <div className="text-xs font-bold text-gray-400 mb-1 tracking-wider uppercase">{step.id} {step.sub}</div>
                    <h3 className={`text-xl font-black bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent mb-2`}>{step.title}</h3>
                    <p className="text-sm text-gray-600 leading-snug">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info: (20260131 - Luphia) Footer */}
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
