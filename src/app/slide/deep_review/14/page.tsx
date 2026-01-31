import { ShieldCheck, GitBranch, Crown } from 'lucide-react';

export default function DeepReviewSlide14() {
  const values = [
    {
      id: 1,
      title: '專業領先',
      sub: 'Professional Leading',
      desc: '業界首創具備 <span class="text-orange-600 font-bold">會計師執業水準</span> 的 AI 模型 FAITH',
      icon: Crown,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      id: 2,
      title: '執行卓越',
      sub: 'Execution Excellence',
      desc: '高效且具備 <span class="text-blue-600 font-bold">自我回測能力</span> 的代理人 AICH',
      icon: ShieldCheck,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      gradient: 'from-blue-500 to-indigo-500',
    },
    {
      id: 3,
      title: '靈活擴充',
      sub: 'Flexible Expansion',
      desc: '透過 DeepForge <span class="text-purple-600 font-bold">持續學習新技能</span> 適應市場變化',
      icon: GitBranch,
      color: 'text-purple-500',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      gradient: 'from-purple-500 to-pink-500',
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
          <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            DeepReview <span className="text-orange-600">核心價值</span>
          </h2>
          <div className="h-1.5 w-32 bg-gradient-to-r from-orange-500 to-amber-400 rounded-full mx-auto"></div>
        </div>

        {/* Info: (20260121 - Luphia) Core Values Cards */}
        <div className="w-full px-20 grid grid-cols-3 gap-10 z-10">
          {values.map((v) => (
            <div key={v.id} className="group relative bg-white rounded-3xl shadow-xl border border-gray-100 p-8 flex flex-col items-center text-center h-[320px] hover:-translate-y-2 transition-all duration-500 overflow-hidden">
              {/* Info: (20260121 - Luphia) Top Gradient Line */}
              <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${v.gradient}`}></div>

              {/* Info: (20260121 - Luphia) Icon */}
              <div className={`w-20 h-20 rounded-2xl ${v.bg} flex items-center justify-center ${v.color} mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                <v.icon size={40} strokeWidth={1.5} />
              </div>

              {/* Info: (20260121 - Luphia) Title */}
              <h3 className={`text-2xl font-bold text-gray-900 mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r ${v.gradient} transition-all`}>
                {v.title}
              </h3>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">{v.sub}</div>

              {/* Info: (20260121 - Luphia) Desc */}
              <p className="text-gray-600 leading-relaxed font-medium text-lg" dangerouslySetInnerHTML={{ __html: v.desc }}></p>

              {/* Info: (20260121 - Luphia) Decorative BG Icon */}
              <div className="absolute -bottom-8 -right-8 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity duration-500">
                <v.icon size={150} />
              </div>
            </div>
          ))}
        </div>

        {/* Info: (20260121 - Luphia) Closing Statement */}
        <div className="mt-16 relative z-20 max-w-4xl text-center px-8 py-6 bg-white/50 backdrop-blur-md rounded-2xl mx-auto">
          <p className="text-2xl text-gray-700 font-medium leading-relaxed">
            <span className="font-bold text-gray-900">iSunFA DeepReview</span> 是您在快速變化的金融市場中，<br />最可靠的<span className="text-orange-600 font-bold border-b-4 border-orange-200">金融商品管理夥伴</span>。
          </p>
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
