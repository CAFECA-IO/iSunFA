import { Fingerprint, FileCheck, BarChart4, Building2 } from 'lucide-react';

export default function DeepInsightSlide16() {
  const features = [
    {
      id: 1,
      title: 'FIDO2 數位身分證',
      subtitle: 'FIDO2 Digital Identity',
      desc: '導入 <span class="text-blue-600 font-bold">FIDO2 國際級無密碼認證標準</span>，結合數位簽章技術，確保每一筆金融交易與資產轉移皆在最高等級的安全框架下執行。',
      icon: Fingerprint,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    },
    {
      id: 2,
      title: '智能會計審計與核銷',
      subtitle: 'Intelligent Audit',
      desc: '運用人工智能會計審計技術，<span class="text-orange-600 font-bold">即時追蹤並自動化核銷</span> 企業之專案執行進度與資金用途，大幅提升投後管理效率，防範資金濫用。',
      icon: FileCheck,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
    },
    {
      id: 3,
      title: '金融商品評級技術',
      subtitle: 'Financial Product Rating',
      desc: '動態整合數位足跡與財報邏輯，透過 AI 評級模型對金融商品進行 <span class="text-indigo-600 font-bold">即時風險量化</span>，提供最具公信力的定價參考。',
      icon: BarChart4,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
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
        <div className="w-full px-16 pt-16 mb-8 relative z-20 text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
            金融監理 <span className="text-orange-600">沙盒實驗</span>
          </h2>
          <h3 className="text-2xl font-bold text-gray-600 mb-6">
            Convertible Bond 可轉換公司債發行與交換平臺
          </h3>

          {/* Info: (20260121 - Luphia) Invitation Box */}
          <div className="max-w-4xl mx-auto bg-white/60 backdrop-blur-md rounded-xl p-6 border border-gray-100 shadow-sm flex items-start gap-4 text-left">
            <div className="p-3 bg-orange-100 rounded-lg text-orange-600">
              <Building2 size={24} />
            </div>
            <div>
              <p className="text-gray-700 leading-relaxed font-medium">
                依據《金融科技發展與創新實驗條例》，我們正積極籌備申請監理沙盒。若貴機構持有 <span className="font-bold text-gray-900">證券商、商業銀行或信託業牌照</span>，我們誠摯邀請您共同擔任「<span className="text-orange-600 font-bold border-b-2 border-orange-200">創新實驗申請人</span>」。
              </p>
            </div>
          </div>
        </div>

        {/* Info: (20260121 - Luphia) Feature Cards */}
        <div className="w-full px-20 grid grid-cols-3 gap-8 z-10">
          {features.map((f) => (
            <div
              key={f.id}
              className={`bg-white rounded-3xl shadow-xl border ${f.border} p-8 flex flex-col items-center text-center h-[320px] hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden`}
            >
              {/* Info: (20260121 - Luphia) Top Accent */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-gray-200 via-${f.color.split('-')[1]}-400 to-gray-200`}></div>

              {/* Info: (20260121 - Luphia) Icon */}
              <div className={`w-16 h-16 rounded-2xl ${f.bg} flex items-center justify-center ${f.color} mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300 relative z-10`}>
                <f.icon size={32} strokeWidth={1.5} />
              </div>

              {/* Info: (20260121 - Luphia) Title */}
              <h3 className={`text-xl font-bold text-gray-900 mb-1 z-10`}>{f.title}</h3>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 z-10">{f.subtitle}</div>

              {/* Info: (20260121 - Luphia) Description */}
              <p className="text-gray-600 text-sm leading-relaxed font-medium text-justify z-10" dangerouslySetInnerHTML={{ __html: f.desc }}></p>

              {/* Info: (20260121 - Luphia) Decorative Background Icon */}
              <div className="absolute -bottom-8 -right-8 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity duration-500 z-0">
                <f.icon size={150} />
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
