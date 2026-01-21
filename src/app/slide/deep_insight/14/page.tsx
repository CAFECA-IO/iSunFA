import { Database, Scale, Cpu, History, BookOpen, LineChart } from 'lucide-react';

export default function DeepInsightSlide14() {
  const advantages = [
    {
      id: 1,
      title: '獨家訓練數據',
      subtitle: 'Exclusive Training Data',
      desc: '整合 <span class="text-blue-700 font-bold text-xl">30 年以上</span> 的財務會計專屬訓練數據，訓練金融事件推理能力',
      icon: Database,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      gradient: 'from-blue-600 to-cyan-500',
      subIcon: History,
    },
    {
      id: 2,
      title: '全面資訊整合',
      subtitle: 'Comprehensive Information',
      desc: '整合 <span class="text-purple-700 font-bold text-xl">逾 20 年</span> 的政策法規與財經媒體、交易所、企業公開資訊',
      icon: Scale,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      gradient: 'from-purple-600 to-pink-500',
      subIcon: BookOpen,
    },
    {
      id: 3,
      title: '卓越模型效能',
      subtitle: 'Model Performance Excellence',
      desc: '具備 <span class="text-orange-700 font-bold">嚴謹的回測驗證</span>、<span class="text-orange-700 font-bold">在地化調適</span> 與 <span class="text-orange-700 font-bold">高質量的 AI 可解釋性</span>',
      icon: Cpu,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      gradient: 'from-orange-600 to-amber-500',
      subIcon: LineChart,
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
          <p className="mt-4 text-xl text-gray-500 font-medium">數據深度與模型優勢</p>
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
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8 z-10">{adv.subtitle}</div>

              {/* Info: (20260121 - Luphia) Description / Content */}
              <p className="text-gray-600 leading-relaxed font-medium text-lg z-10" dangerouslySetInnerHTML={{ __html: adv.desc }}></p>

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
            2026 iSunFA Corp.
          </div>
        </div>
      </div>
    </div>
  );
}
