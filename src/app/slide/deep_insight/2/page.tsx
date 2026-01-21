import { Database, Brain, Zap, ShieldCheck } from 'lucide-react';

export default function DeepInsightSlide2() {
  const features = [
    {
      title: '全方位資訊聚合',
      desc: '橫跨新聞、社群、財報、司法、政府與專利等多維度數據，打破資訊孤島。',
      icon: Database,
    },
    {
      title: '深度的量化與質化分析',
      desc: '不僅提供數據，更提供具備專業會計邏輯的分析建議，將原始數據轉化為可執行洞察。',
      icon: Brain,
    },
    {
      title: '端到端的自動化流程',
      desc: '從需求理解到報告生成，全程無人值守或半自動化引導，大幅提升分析效率。',
      icon: Zap,
    },
    {
      title: '高可信度的驗證機制',
      desc: '內建歷史回測與數據校正機制，確保報告準確性與可靠性。',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4">
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
        <div className="absolute top-16 left-16">
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            DeepInsight <span className="text-orange-600">能提供什麼服務？</span>
          </h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-orange-500 to-amber-400 mt-4 rounded-full"></div>
        </div>

        {/* Info: (20260121 - Luphia) Content Container - Grid */}
        <div className="z-10 w-full px-16 mt-24">
          <div className="grid grid-cols-2 gap-10">
            {features.map((feature, idx) => (
              <div key={idx} className="flex gap-6 p-8 rounded-2xl bg-white/95 border border-orange-200 shadow-lg hover:shadow-xl transition-all group backdrop-blur-md">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300 shadow-inner">
                    <feature.icon size={32} strokeWidth={1.5} />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-orange-700 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-lg text-gray-700 leading-relaxed font-medium">
                    {feature.desc}
                  </p>
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
