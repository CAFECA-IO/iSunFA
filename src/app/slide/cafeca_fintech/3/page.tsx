
import React from 'react';
import { Fingerprint, Lock, Server, Brain, Zap } from 'lucide-react';

export default function CafecaFintechSlide3() {
  return (
    <div className="h-full w-full bg-slate-50 relative flex overflow-hidden">

      {/* Info: (20260122 - Luphia) Left Sidebar - Title and Decoration */}
      <div className="w-[30%] h-full bg-slate-900 text-white p-10 flex flex-col justify-between relative shadow-2xl z-20">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-900/50 border border-sky-700/50 text-sky-400 text-xs font-bold tracking-wider mb-8">
            <Zap size={14} />
            CORE TECHNOLOGY
          </div>

          <h2 className="text-5xl font-extrabold leading-tight mb-6">
            <span className="text-sky-400">核心</span>
            <br />
            技術
          </h2>
          <p className="text-slate-400 leading-relaxed text-lg">
            四大核心支柱，構建安全、高效、智能的金融科技生態系統。
          </p>
        </div>

        {/* Info: (20260122 - Luphia) Abstract graphic */}
        <div className="relative w-full aspect-square border-t border-slate-700 pt-8 opacity-50">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/20 to-transparent rounded-full blur-3xl"></div>
          <div className="grid grid-cols-2 gap-4 h-full">
            <div className="bg-slate-800/50 rounded-2xl"></div>
            <div className="bg-slate-800/30 rounded-2xl translate-y-8"></div>
            <div className="bg-slate-800/30 rounded-2xl -translate-y-4"></div>
            <div className="bg-slate-800/50 rounded-2xl"></div>
          </div>
        </div>
      </div>

      {/* Info: (20260122 - Luphia) Right Content - 2x2 Grid */}
      <div className="flex-1 h-full p-12 bg-slate-100 flex items-center justify-center">
        <div className="grid grid-cols-2 gap-8 w-full max-w-5xl h-full max-h-[600px]">

          {/* Info: (20260122 - Luphia) Card 1: Digital ID */}
          <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 group border border-slate-200">
            <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center mb-6 text-sky-600 group-hover:scale-110 transition-transform duration-300">
              <Fingerprint size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">CAFECA 數位身份證</h3>
            <p className="text-slate-600 text-sm leading-relaxed text-justify">
              利用生物識別和先進加密技術，我們創建不可篡改的數位 ID 和電子簽章系統。
            </p>
          </div>

          {/* Info: (20260122 - Luphia) Card 2: Alohomora */}
          <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 group border border-slate-200">
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 text-purple-600 group-hover:scale-110 transition-transform duration-300">
              <Lock size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Alohomora 同態加密</h3>
            <p className="text-slate-600 text-sm leading-relaxed text-justify">
              透過特殊的代數結構設計，使資訊在加密狀態下仍能保有數學特性，實現數據可用不可見的高強度安全計算。
            </p>
          </div>

          {/* Info: (20260122 - Luphia) Card 3: Locutus */}
          <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 group border border-slate-200">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 group-hover:scale-110 transition-transform duration-300">
              <Server size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Locutus 邊緣運算</h3>
            <p className="text-slate-600 text-sm leading-relaxed text-justify">
              利用邊緣運算技術整合全球分佈式閒置節點，構建出具備極致彈性與超大規模的去中心化算力矩陣。
            </p>
          </div>

          {/* Info: (20260122 - Luphia) Card 4: FAITH */}
          <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 group border border-slate-200">
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 text-orange-600 group-hover:scale-110 transition-transform duration-300">
              <Brain size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">FAITH 智能模型</h3>
            <p className="text-slate-600 text-sm leading-relaxed text-justify">
              會計專業多模態模型，驅動 iSunFA 等多元化的 AI 自動化服務，賦能企業實現智慧會計轉型。
            </p>
          </div>

        </div>
      </div>

      {/* Info: (20260122 - Luphia) Footer for Right Side */}
      <div className="absolute bottom-6 right-12 text-slate-300 text-[10px] font-mono mix-blend-multiply">
        CAFECA FINTECH • CORE TECHNOLOGIES
      </div>

    </div>
  );
}
