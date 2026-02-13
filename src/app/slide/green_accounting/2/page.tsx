'use client';

export default function GreenAccountingSlide2() {
  return (
    <div className="min-h-screen w-full bg-neutral-900 flex items-center justify-center p-4">
      <div className="w-[1280px] h-[720px] bg-neutral-900 relative overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-neutral-800 text-white">

        {/* Info: (20260212 - Luphia) Background Gradients - Deep Emerald Theme */}
        <div
          className="absolute inset-0 z-0 opacity-40"
          style={{
            background: 'radial-gradient(circle at 50% 50%, #064e3b 0%, #022c22 40%, #000000 100%)',
          }}
        />

        {/* Info: (20260212 - Luphia) Dynamic Ring Decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-emerald-500/20 rounded-full animate-[spin_60s_linear_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-emerald-500/10 rounded-full animate-[spin_40s_linear_infinite_reverse]" />

        {/* Info: (20260212 - Luphia) Content Container */}
        <div className="z-10 text-center space-y-12 animate-fade-in-up">

          {/* Info: (20260212 - Luphia) Chinese Slogan */}
          <h1 className="text-8xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-300 to-teal-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.3)]">
            領航淨零，智算未來
          </h1>

          {/* Info: (20260212 - Luphia) English Slogan */}
          <p className="text-4xl font-light tracking-[0.1em] text-emerald-100/80 font-mono">
            Lead the Net Zero, Quantify the Future
          </p>

        </div>

        {/* Info: (20260212 - Luphia) Footer */}
        <div className="absolute bottom-6 w-full px-16 flex justify-between text-neutral-500 text-[10px] tracking-[0.2em] uppercase font-medium">
          <div>iSunFA Green Accounting</div>
          <div className="flex gap-2 items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
            2026 CAFECA Fintech
          </div>
        </div>

      </div>
    </div>
  );
}
