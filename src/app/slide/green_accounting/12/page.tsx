'use client';

import { Mail, Globe, Building2 } from 'lucide-react';

export default function GreenAccountingSlide12() {
  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-4 font-sans">
      <div className="w-[1280px] h-[720px] bg-neutral-950 relative overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-neutral-800 text-white">

        {/* Info: (20260212 - Luphia) Background: Deep Space & Emerald Aurora */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[30%] left-[50%] -translate-x-1/2 w-[80%] h-[80%] bg-emerald-900/20 blur-[150px] rounded-full opacity-50" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05] pointer-events-none"></div>
        </div>

        <div className="z-10 w-full max-w-5xl px-12 flex flex-col items-center justify-center h-full text-center">

          {/* Info: (20260212 - Luphia) Main Content */}
          <div className="mb-12 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold tracking-widest uppercase mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              準備轉型
            </div>

            <h2 className="text-7xl font-bold tracking-tight text-white mb-6">
              開啟您的 <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">綠色旅程</span>
            </h2>

            <p className="text-neutral-400 text-2xl font-light max-w-3xl mx-auto leading-relaxed">
              加入領先企業行列，透過智能金融科技實現淨零目標。
            </p>
          </div>

          {/* Info: (20260212 - Luphia) Contact Card */}
          <div className="bg-neutral-900/50 border border-white/10 p-10 rounded-3xl backdrop-blur-md w-full max-w-2xl transform hover:scale-105 transition-transform duration-500 group">
            <h3 className="text-2xl font-bold mb-8 text-neutral-200">聯繫我們</h3>

            <div className="flex flex-col items-center gap-6">
              <a href="mailto:contact@isunfa.com" className="flex items-center gap-4 text-3xl font-light text-white hover:text-emerald-400 transition-colors group-hover:tracking-wide duration-300">
                <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-400">
                  <Mail size={32} />
                </div>
                contact@isunfa.com
              </a>

              <div className="w-1/2 h-px bg-neutral-800 my-2"></div>

              <div className="flex gap-8">
                <a href="https://isunfa.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors text-sm uppercase tracking-wider">
                  <Globe size={16} /> 官方網站
                </a>
                <a href="https://cafeca.com.tw" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors text-sm uppercase tracking-wider">
                  <Building2 size={16} /> CAFECA
                </a>
              </div>
            </div>
          </div>

          {/* Info: (20260212 - Luphia) Footer Brand */}
          <div className="mt-20 opacity-50">
            <div className="text-2xl font-bold text-neutral-600 tracking-[0.2em]">iSunFA</div>
          </div>

        </div>

        {/* Info: (20260212 - Luphia) Footer */}
        <div className="absolute bottom-6 w-full px-16 flex justify-between text-neutral-600 text-[10px] tracking-[0.2em] uppercase font-medium">
          <div>綠色永續金融</div>
          <div className="flex gap-2 items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-800"></div>
            2026 CAFECA Fintech
          </div>
        </div>

      </div>
    </div>
  );
}
