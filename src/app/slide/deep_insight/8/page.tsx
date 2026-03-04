import { Brain, Bot, GraduationCap } from 'lucide-react';

export default function DeepInsightSlide4() {
  const pillars = [
    {
      id: 'faith',
      title: 'FAITH',
      version: 'v0.1.0',
      subtitle: '多模態會計專業模型',
      desc: '具備大學通識與會計師專業，理解非結構化資料，負責任務拆解。作為系統的「大腦」，提供專業邏輯與決策支持。',
      role: '系統的大腦',
      icon: Brain,
      color: 'from-orange-500 to-amber-500',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
    },
    {
      id: 'aich',
      title: 'AICH',
      version: 'v0.8.0',
      subtitle: '自監督式執行代理人',
      desc: '執行爬蟲、摘要、資料庫探索，忠實執行繁瑣任務並檢驗信心指數。作為系統的「手腳」，確保任務精確執行。',
      role: '系統的手腳',
      icon: Bot,
      color: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
    },
    {
      id: 'deepforge',
      title: 'DeepForge',
      version: 'v0.1.0',
      subtitle: '代理人訓練基地',
      desc: '專為 AICH 設計的訓練環境，持續擴充任務執行能力。作為系統的「學院」，不斷提升代理人的技能邊界。',
      role: '系統的學院',
      icon: GraduationCap,
      color: 'from-purple-500 to-pink-500',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
    }
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
        <div className="w-full px-16 pt-16 mb-12 relative z-20">
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            核心技術支柱 — <span className="text-orange-600">三位一體架構</span>
          </h2>
          <div className="h-1.5 w-32 bg-gradient-to-r from-orange-500 to-amber-400 mt-4 rounded-full"></div>
          <p className="mt-4 text-xl text-gray-500 font-medium">The Trinity Architecture</p>
        </div>

        {/* Info: (20260121 - Luphia) Cards Container */}
        <div className="w-full px-16 grid grid-cols-3 gap-8 z-10">
          {pillars.map((pillar) => (
            <div
              key={pillar.id}
              className="relative group h-[420px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
            >
              {/* Info: (20260121 - Luphia) Top Accent Bar */}
              <div className={`h-2 w-full bg-gradient-to-r ${pillar.color}`}></div>

              <div className="p-8 flex flex-col h-full">
                {/* Info: (20260121 - Luphia) Icon & Title */}
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-16 h-16 rounded-2xl ${pillar.bg} flex items-center justify-center ${pillar.text} shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                    <pillar.icon size={32} strokeWidth={1.5} />
                  </div>
                  <div className="text-right">
                    <h3 className={`text-3xl font-black bg-gradient-to-r ${pillar.color} bg-clip-text text-transparent tracking-tight font-sans`}>{pillar.title}</h3>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${pillar.bg} ${pillar.text} mt-1`}>
                      {pillar.version}
                    </span>
                  </div>
                </div>

                {/* Info: (20260121 - Luphia) Subtitle */}
                <h4 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                  {pillar.subtitle}
                </h4>

                {/* Info: (20260121 - Luphia) Description */}
                <p className="text-gray-600 leading-relaxed text-justify mb-auto font-medium">
                  {pillar.desc}
                </p>

                {/* Info: (20260121 - Luphia) Role Tag */}
                <div className={`mt-6 py-3 px-4 rounded-xl ${pillar.bg} border ${pillar.border} flex items-center justify-center gap-2`}>
                  <span className={`font-bold ${pillar.text} text-sm tracking-wide`}>
                    {pillar.role}
                  </span>
                </div>
              </div>

              {/* Info: (20260121 - Luphia) Decorative Background Icon */}
              <div className="absolute -bottom-12 -right-12 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity duration-500">
                <pillar.icon size={200} />
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
