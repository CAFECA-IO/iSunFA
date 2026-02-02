import { LineChart, Fingerprint, Mic, Tags } from 'lucide-react';
import SlideQRCode from '@/components/slide/slide_qr_code';

export default function DeepReviewSlide2() {
  const features = [
    {
      title: '深度競爭力分析',
      desc: '結合 NLP 技術比對商品介紹文字，自動生成包含歷史績效、風險報酬比及前十大成分股的深度競品報告。',
      icon: LineChart,
    },
    {
      title: '數位身分證與簽核',
      desc: '利用生物辨識技術串接審查簽核流程，自動發送審查 Email 並追蹤委員回覆進度，確保審查軌跡完整留存。',
      icon: Fingerprint,
    },
    {
      title: '智能會議助理',
      desc: '將錄音自動轉為逐字稿，並由 GAI 針對討論重點進行摘要彙整，加速會議紀錄產出。',
      icon: Mic,
    },
    {
      title: '動態商品標籤',
      desc: '根據最新市場趨勢或投行報告挖掘新標籤，並實現商品與投資主題，如：矽光子平臺、生物相似藥、鈣鈦礦電池等的精準配對。',
      icon: Tags,
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
        <div className="absolute top-16 left-16 z-20">
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            DeepReview <span className="text-orange-600">能提供什麼服務？</span>
          </h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-orange-500 to-amber-400 mt-4 rounded-full"></div>
        </div>

        {/* Info: (20260121 - Luphia) Content Container - Flex */}
        <div className="z-10 w-full h-full pt-32 px-16 pb-16 flex">
          {/* Info: (20260121 - Luphia) Left Content - 70% */}
          <div className="w-[70%] pr-8 flex items-center">
            <div className="grid grid-cols-2 gap-6">
              {features.map((feature, idx) => (
                <div key={idx} className="flex gap-4 p-5 rounded-2xl bg-white/95 border border-orange-200 shadow-md hover:shadow-lg transition-all group backdrop-blur-md">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300 shadow-inner">
                      <feature.icon size={24} strokeWidth={1.5} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-700 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-[15px] text-gray-700 leading-relaxed font-medium">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info: (20260121 - Luphia) Right Content - 30% - QR Code */}
          <div className="w-[30%] flex flex-col items-center justify-center border-l border-gray-200/50 pl-8">
            <SlideQRCode
              url="https://irsc.isunfa.com"
              className=""
              size={220}
            />
            <p className="mt-6 text-center text-gray-600 font-medium">
              掃描 QR Code<br />立即體驗智能分析
            </p>
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
