import React from 'react';
import { CheckCircle2, FileSignature, Wrench, HandCoins } from 'lucide-react';

export default function GreenAccountingSlide10() {
  const steps = [
    {
      id: "01",
      title: "資格確認",
      desc: "確認符合新北市轄內依法登記之公司或商號資格。",
      icon: <CheckCircle2 className="w-8 h-8 text-white" />,
      position: "top"
    },
    {
      id: "02",
      title: "簽約啟動",
      desc: "完成簽約與費用支付，即刻啟動導入。",
      icon: <FileSignature className="w-8 h-8 text-white" />,
      position: "bottom"
    },
    {
      id: "03",
      title: "部署培訓",
      desc: "專人到府進行軟硬體建置，並提供完整操作教學。",
      icon: <Wrench className="w-8 h-8 text-white" />,
      position: "top"
    },
    {
      id: "04",
      title: "補助申請",
      desc: "憑執行成果與發票，向經發局申請補助款。",
      icon: <HandCoins className="w-8 h-8 text-white" />,
      position: "bottom"
    }
  ];

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-4 font-sans">
      <div className="w-[1280px] h-[720px] bg-neutral-950 relative overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-neutral-800 text-white">

        {/* Info: (20260212 - Luphia) Background: Subtle Tech Glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[20%] left-[10%] w-[40%] h-[40%] bg-emerald-900/10 blur-[100px] rounded-full" />
          <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[40%] bg-orange-900/10 blur-[100px] rounded-full" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none"></div>
        </div>

        <div className="z-10 w-full max-w-[1100px] px-12 flex flex-col h-full py-16">

          {/* Info: (20260212 - Luphia) Title Section */}
          <div className="mb-16 text-center space-y-4">
            <h2 className="text-5xl font-extrabold tracking-tight text-white">
              申請流程簡單四步驟
            </h2>
            <div className="h-1 w-32 bg-gradient-to-r from-orange-500 to-emerald-500 rounded-full mx-auto mt-6" />
          </div>

          {/* Info: (20260212 - Luphia) Process Wave */}
          <div className="flex-1 relative flex items-center justify-center">

            {/* Info: (20260212 - Luphia) Connecting Line (SVG Curve) */}
            <svg className="absolute top-1/2 left-0 w-full h-48 -translate-y-1/2 pointer-events-none" style={{ overflow: 'visible' }}>
              <path
                d="M 100 0 C 250 0, 250 150, 400 150 C 550 150, 550 0, 700 0 C 850 0, 850 150, 1000 150"
                fill="none"
                stroke="url(#gradient-line)"
                strokeWidth="4"
                strokeLinecap="round"
                className="opacity-50"
              />
              <defs>
                <linearGradient id="gradient-line" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="50%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
            </svg>

            <div className="w-full grid grid-cols-4 gap-4 relative z-10">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className={`flex flex-col items-center ${step.position === 'bottom' ? 'mt-24' : '-mt-24'}`}
                >
                  {/* Info: (20260212 - Luphia) Number Circle */}
                  <div className={`relative w-32 h-32 rounded-full border-4 ${index % 2 === 0 ? 'border-orange-500 bg-neutral-900' : 'border-emerald-500 bg-neutral-900'} flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] z-10 group transition-transform duration-500 hover:scale-110`}>
                    <span className={`text-5xl font-bold ${index % 2 === 0 ? 'text-orange-500' : 'text-emerald-500'}`}>{step.id}</span>

                    {/* Info: (20260212 - Luphia) Floating Icon Badge */}
                    <div className={`absolute -right-2 -bottom-2 w-10 h-10 rounded-full flex items-center justify-center ${index % 2 === 0 ? 'bg-orange-600' : 'bg-emerald-600'} shadow-lg`}>
                      {React.cloneElement(step.icon as React.ReactElement<{ className?: string }>, { className: "w-5 h-5 text-white" })}
                    </div>
                  </div>

                  {/* Info: (20260212 - Luphia) Text Content */}
                  <div className={`mt-8 text-center max-w-[240px] ${step.position === 'top' ? 'order-first mb-8 mt-0' : ''}`}>
                    <h3 className="text-2xl font-bold text-white mb-3">{step.title}</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed">{step.desc}</p>
                  </div>

                </div>
              ))}
            </div>
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
