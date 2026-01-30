import { Globe2, Cpu, Scale, TrendingUp, HeartHandshake } from 'lucide-react';

export default function DeepInsightSlide15() {
  const points = [
    {
      id: 1,
      title: '市場先機',
      subtitle: 'Market Opportunity',
      desc: '2025 年適逢 <span class="text-orange-600 font-bold">人工智能政策驅動</span> 的關鍵轉折點，正是產品全面部署的最佳戰略時機。',
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
    },
    {
      id: 2,
      title: '技術核心',
      subtitle: 'Core Technology',
      desc: '以 <span class="text-blue-600 font-bold">三大會計審計專屬 AI 模型</span> 為基礎，構建人工智能會計審計的服務標準化。',
      icon: Cpu,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    },
    {
      id: 3,
      title: '國際接軌',
      subtitle: 'Global Alignment',
      desc: '與國際權威機構結盟，共同定義 <span class="text-indigo-600 font-bold">ESG 量化評估指標與標準</span>，確保領先地位。',
      icon: Globe2,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
    },
    {
      id: 4,
      title: '營收動能',
      subtitle: 'Revenue Momentum',
      desc: '採用高預測性的訂閱制營收模式，預期 <span class="text-green-600 font-bold">毛利率將突破 70%</span>，展現強勁獲利能力。',
      icon: Scale,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
    },
    {
      id: 5,
      title: '社會價值',
      subtitle: 'Social Value',
      desc: '透過先進技術深耕並強化 <span class="text-pink-600 font-bold">ESG 永續投資</span> 的價值主張，推動正向循環。',
      icon: HeartHandshake,
      color: 'text-pink-600',
      bg: 'bg-pink-50',
      border: 'border-pink-200',
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
            為何 <span className="text-orange-600">選擇我們？</span>
          </h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-orange-500 to-amber-400 mt-6 rounded-full mx-auto"></div>

          <div className="mt-8 max-w-4xl mx-auto bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-100 shadow-sm relative">
            <div className="text-xl text-gray-700 font-medium leading-relaxed">
              我們不只是一家會計軟體公司——<br />我們是 <span className='font-bold text-gray-900'>人工智能、先進金融科技、企業永續</span> 相互交織的關鍵核心樞紐
            </div>
            {/* Info: (20260121 - Luphia) Quote Icons */}
            <div className="absolute top-4 left-4 text-gray-200 transform -scale-x-100 font-serif text-6xl leading-none">❝</div>
            <div className="absolute bottom-[-20px] right-4 text-gray-200 font-serif text-6xl leading-none">❞</div>
          </div>
        </div>

        {/* Info: (20260121 - Luphia) 5 Key Points Grid */}
        <div className="w-full px-12 z-10">
          <div className="grid grid-cols-5 gap-4">
            {points.map((p) => (
              <div key={p.id} className={`bg-white rounded-2xl shadow-lg border ${p.border} p-5 flex flex-col items-center text-center h-[340px] hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden`}>
                {/* Info: (20260121 - Luphia) Icon */}
                <div className={`w-14 h-14 rounded-xl ${p.bg} flex items-center justify-center ${p.color} mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300 z-10`}>
                  <p.icon size={28} strokeWidth={2} />
                </div>

                {/* Info: (20260121 - Luphia) Title */}
                <h3 className={`text-lg font-bold ${p.color} mb-1 z-10`}>{p.title}</h3>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 z-10">{p.subtitle}</div>

                {/* Info: (20260121 - Luphia) Desc */}
                <p className="text-gray-600 text-xs leading-relaxed font-medium text-justify z-10" dangerouslySetInnerHTML={{ __html: p.desc }}></p>

                {/* Info: (20260121 - Luphia) Decorative Background Icon */}
                <div className="absolute -bottom-6 -right-6 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity duration-500 z-0">
                  <p.icon size={120} />
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
            2026 CAFECA Fintech
          </div>
        </div>
      </div>
    </div>
  );
}
