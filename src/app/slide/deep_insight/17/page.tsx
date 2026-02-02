import { Users, ClipboardCheck, Layers, Trophy, Briefcase, Rocket } from 'lucide-react';

export default function DeepInsightSlide13() {
  const advantages = [
    {
      id: 1,
      title: '市場實績',
      subtitle: 'Market Validation',
      highlight: '逾 2,000 名會計軟體用戶實測',
      desc: '客戶群涵蓋各類核心產業，市場實績紮實，系統穩定性與實用性備受肯定。',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      gradient: 'from-blue-600 to-indigo-500',
      subIcon: Trophy,
    },
    {
      id: 2,
      title: '實務驗證',
      subtitle: 'Practical Verification',
      highlight: '流程經過財會實務深度驗證',
      desc: '由專業會計師團隊參與設計，邏輯嚴謹，可無縫對接既有作業流程，降低導入門檻。',
      icon: ClipboardCheck,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      gradient: 'from-orange-600 to-amber-500',
      subIcon: Briefcase,
    },
    {
      id: 3,
      title: '標準架構',
      subtitle: 'Standardized Architecture',
      highlight: '具備標準化導入架構',
      desc: '模組化設計確保系統能迅速推廣至不同應用場景，並具備持續優化與擴充的彈性。',
      icon: Layers,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      gradient: 'from-green-600 to-emerald-500',
      subIcon: Rocket,
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
            我們的 <span className="text-orange-600">優勢</span>
          </h2>
          <p className="mt-4 text-xl text-gray-500 font-medium">具備市場驗證之實戰能力</p>
          <div className="h-1.5 w-24 bg-gradient-to-r from-orange-500 to-amber-400 mt-6 rounded-full mx-auto"></div>
        </div>

        {/* Info: (20260121 - Luphia) Advantage Cards */}
        <div className="w-full px-20 grid grid-cols-3 gap-8 z-10">
          {advantages.map((adv) => (
            <div
              key={adv.id}
              className={`bg-white rounded-3xl shadow-xl border ${adv.border} p-8 flex flex-col items-center text-center h-[420px] hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden`}
            >
              {/* Info: (20260121 - Luphia) Top Accent */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${adv.gradient}`}></div>

              {/* Info: (20260121 - Luphia) Icon */}
              <div className={`w-20 h-20 rounded-2xl ${adv.bg} flex items-center justify-center ${adv.color} mb-6 shadow-inner group-hover:scale-110 transition-transform duration-300 z-10 relative`}>
                <adv.icon size={40} strokeWidth={1.5} />
                <div className="absolute -right-2 -bottom-2 bg-white rounded-full p-1 shadow-md border border-gray-100">
                  <adv.subIcon size={16} className={adv.color} />
                </div>
              </div>

              {/* Info: (20260121 - Luphia) Title */}
              <h3 className="text-2xl font-bold text-gray-900 mb-1 z-10">{adv.title}</h3>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 z-10">{adv.subtitle}</div>

              {/* Info: (20260121 - Luphia) Highlight */}
              <div className={`mb-4 px-3 py-1.5 rounded-lg ${adv.bg} ${adv.color} font-bold text-sm inline-block z-10 shadow-sm border ${adv.border}`}>
                {adv.highlight}
              </div>

              {/* Info: (20260121 - Luphia) Description */}
              <p className="text-gray-600 leading-relaxed font-medium text-justify text-sm z-10">
                {adv.desc}
              </p>

              {/* Info: (20260121 - Luphia) Decorative Background Icon */}
              <div className="absolute -bottom-8 -right-8 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity duration-500 z-0">
                <adv.icon size={180} />
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
