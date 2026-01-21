import { EyeOff, Hourglass, Scale } from 'lucide-react';

export default function DeepInsightSlide3() {
  const painPoints = [
    {
      id: 1,
      title: '視角侷限',
      subtitle: 'Perspective Limitation',
      desc: '傳統分析往往侷限於企業單方面提供的敘述與官方揭露的制式資訊',
      icon: EyeOff,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
      border: 'border-slate-200',
    },
    {
      id: 2,
      title: '效率瓶頸',
      subtitle: 'Efficiency Bottleneck',
      desc: '人工分析的速度已無法跟上現今數據爆發的步調',
      icon: Hourglass,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
    },
    {
      id: 3,
      title: '主觀偏誤',
      subtitle: 'Subjective Bias',
      desc: '分析師容易下意識地尋找能支持其既有立場的證據',
      icon: Scale,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
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
        <div className="w-full px-16 pt-16 mb-16 relative z-20 text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            傳統分析的 <span className="text-orange-600">侷限性</span>
          </h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-orange-500 to-amber-400 mt-6 rounded-full mx-auto"></div>
        </div>

        {/* Info: (20260121 - Luphia) Pain Points Cards */}
        <div className="w-full px-20 grid grid-cols-3 gap-10 z-10">
          {painPoints.map((point) => (
            <div
              key={point.id}
              className={`bg-white rounded-3xl shadow-xl border ${point.border} p-8 flex flex-col items-center text-center h-[350px] hover:-translate-y-2 transition-all duration-300 group`}
            >
              <div className={`w-24 h-24 rounded-full ${point.bg} flex items-center justify-center ${point.color} mb-8 shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                <point.icon size={48} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{point.title}</h3>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">{point.subtitle}</div>
              <p className="text-gray-600 leading-relaxed font-medium text-lg">
                {point.desc}
              </p>
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
