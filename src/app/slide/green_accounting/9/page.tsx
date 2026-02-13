'use client';

import { UserCog, ShieldCheck, CloudUpload, RefreshCw, Wrench, Infinity } from 'lucide-react';

export default function GreenAccountingSlide9() {
  const commitments = [
    {
      icon: <UserCog className="w-8 h-8 text-emerald-400" />,
      title: "專人到府部署",
      desc: "專業工程師親自到場設定，免除 IT 門檻，確保系統即刻上線運作。"
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-emerald-400" />,
      title: "金融級資安",
      desc: "採本地端加密存儲技術，確保財務數據與商業機密滴水不漏。"
    },
    {
      icon: <CloudUpload className="w-8 h-8 text-emerald-400" />,
      title: "自動異地備援",
      desc: "每日數據加密備份至異地雲端，完善災難復原機制，營運不中斷。"
    },
    {
      icon: <RefreshCw className="w-8 h-8 text-emerald-400" />,
      title: "法規合規更新",
      desc: "系統隨稅法、會計準則及 ISO 規範自動同步更新，確保企業永遠合規。"
    },
    {
      icon: <Wrench className="w-8 h-8 text-emerald-400" />,
      title: "硬體安心保固",
      desc: "提供硬體故障即時檢修與替換服務，保障企業財務運作零停擺。"
    },
    {
      icon: <Infinity className="w-8 h-8 text-emerald-400" />,
      title: "無限量授權",
      desc: "不限憑證張數、不限報表產出數量，滿足企業成長擴張需求。"
    }
  ];

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-4 font-sans">
      <div className="w-[1280px] h-[720px] bg-neutral-950 relative overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-neutral-800 text-white">

        {/* Info: (20260212 - Luphia) Background: Subtle Tech Glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[60%] bg-emerald-900/10 blur-[120px] rounded-full" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none"></div>
        </div>

        <div className="z-10 w-full max-w-6xl px-12 flex flex-col h-full py-16">

          {/* Info: (20260212 - Luphia) Title Section */}
          <div className="mb-12 text-center space-y-4">
            <h2 className="text-5xl font-extrabold tracking-tight text-white">
              六大基礎服務承諾：讓您導入無後顧之憂
            </h2>
            <div className="h-1 w-32 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mx-auto mt-6" />
          </div>

          {/* Info: (20260212 - Luphia) 3x2 Grid */}
          <div className="grid grid-cols-3 gap-6 flex-1 px-4">
            {commitments.map((item, index) => (
              <div
                key={index}
                className="group relative bg-neutral-900/40 border border-white/10 p-6 rounded-2xl backdrop-blur-xl hover:border-emerald-500/50 hover:bg-neutral-900/60 transition-all duration-500 flex flex-col"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-emerald-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {item.title}
                  </h3>
                </div>
                <p className="text-neutral-400 leading-relaxed text-sm">
                  {item.desc}
                </p>
                {/* Info: (20260212 - Luphia) Decorative Corner */}
                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info: (20260212 - Luphia) Footer */}
        <div className="absolute bottom-6 w-full px-16 flex justify-between text-neutral-500 text-[10px] tracking-[0.2em] uppercase font-medium">
          <div>領航淨零，智算未來</div>
          <div className="flex gap-2 items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
            2026 CAFECA Fintech
          </div>
        </div>

      </div>
    </div>
  );
}
