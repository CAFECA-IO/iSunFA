import { Zap, Server, Timer, Cloud } from 'lucide-react';

export default function DeepInsightSlide16() {
  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4">
      {/* Info: (20260130 - Luphia) Container 1280x720 */}
      <div className="w-[1280px] h-[720px] bg-white relative overflow-hidden shadow-2xl flex flex-col items-center border border-gray-200">

        {/* Info: (20260130 - Luphia) Background Gradients */}
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl pointer-events-none">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[70rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff8c00] to-[#ffda44] opacity-20"
            style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} />
        </div>

        {/* Info: (20260130 - Luphia) Header */}
        <div className="w-full px-16 pt-12 mb-8 relative z-20 text-center">
          <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold rounded-full uppercase tracking-wider mb-4 inline-block shadow-sm">
            Efficiency
          </span>
          <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
            極速調校 <span className="text-orange-600">Rapid Fine-tuning</span>
          </h2>
          <p className="mt-4 text-xl text-gray-500 font-medium tracking-wide">
            高效能運算資源，縮短模型訓練週期
          </p>
        </div>

        {/* Info: (20260130 - Luphia) Main Content */}
        <div className="w-full px-20 flex-1 flex flex-col items-center justify-center pb-12 relative z-10">

          {/* Info: (20260130 - Luphia) Hero Card */}
          <div className="w-full max-w-4xl bg-white rounded-3xl p-10 shadow-2xl border border-gray-100 relative overflow-hidden group hover:shadow-[0_20px_60px_-15px_rgba(249,115,22,0.15)] transition-all duration-500">

            {/* Info: (20260130 - Luphia) Background Decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-50 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 opacity-50"></div>

            <div className="relative z-10 flex gap-10 items-center">
              {/* Info: (20260130 - Luphia) Icon Section */}
              <div className="shrink-0 flex flex-col items-center gap-4">
                <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200 group-hover:scale-105 transition-transform duration-500">
                  <Zap size={48} fill="currentColor" className="text-white" />
                </div>
                <div className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                  High Speed
                </div>
              </div>

              {/* Info: (20260130 - Luphia) Text Content */}
              <div className="flex-1 space-y-4">
                <h3 className="text-3xl font-bold text-gray-900">
                  單節點 <span className="text-orange-600">8 小時</span> 完成調校
                </h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  整合租用 <span className="font-bold text-gray-800">台智雲 (TWSC)</span> NVIDIA H100 AI 超算力雲平台。
                  透過專屬優化的運算節點，大幅提升模型微調效率，將傳統數天的訓練時間縮短至 <span className="font-bold text-orange-600">8 小時</span> 內。
                </p>

                {/* Info: (20260130 - Luphia) Features Grid */}
                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Server size={18} />
                    </div>
                    <span className="font-medium text-sm">NVIDIA H100 GPU</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                      <Cloud size={18} />
                    </div>
                    <span className="font-medium text-sm">TWSC AI Cloud Platform</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <Timer size={18} />
                    </div>
                    <span className="font-medium text-sm">Fast Turnaround Time</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Info: (20260130 - Luphia) Footer */}
        <div className="absolute bottom-4 w-full px-16 flex justify-between text-gray-400 text-xs tracking-widest uppercase font-medium">
          <div>Power by: TWAI</div>
          <div className="flex gap-2 items-center">
            <div className="w-2 h-2 rounded-full bg-orange-400"></div>
            2026 CAFECA Fintech
          </div>
        </div>
      </div>
    </div>
  );
}
