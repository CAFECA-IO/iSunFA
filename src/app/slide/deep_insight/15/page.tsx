'use client';

import { Cpu, Zap, Wifi, ShieldCheck, Server, Lock } from 'lucide-react';
import Image from 'next/image';

export default function DeepInsightSlide15() {
  const specs = [
    {
      icon: Cpu,
      label: '處理器架構 (Processor)',
      value: 'ARM v9.2 + NVIDIA Blackwell',
      desc: '次世代異質運算架構，優化 AI 處理效能。',
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-100',
    },
    {
      icon: Server,
      label: '統一記憶體 (Unified Memory)',
      value: '128GB LPDDR5X',
      desc: '統一記憶體空間，專為大型模型推論優化。',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      icon: Zap,
      label: 'AI 運算效能 (Performance)',
      value: '1 PetaFLOP (FP4)',
      desc: '桌機級超級電腦效能，支援本地 LLM 微調。',
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-100',
    },
    {
      icon: Wifi,
      label: '連接能力 (Connectivity)',
      value: '10G LAN + Wi-Fi 7',
      desc: '超低延遲網路，支援分散式訓練與叢集擴充。',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-100',
    },
  ];

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
        <div className="w-full px-16 pt-10 mb-6 relative z-20 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-full uppercase tracking-wider">Infrastructure</span>
              <span className="text-orange-600 font-bold tracking-wider uppercase text-sm">邊緣 AI 運算 (Edge AI)</span>
            </div>
            <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight">
              本地運行 <span className="text-orange-600">Local Execution</span>
            </h2>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900 tracking-tight">ASUS Ascent GX10</div>
            <div className="text-gray-500 font-medium">個人化 AI 超級電腦 (Personal AI Supercomputer)</div>
          </div>
        </div>

        {/* Info: (20260130 - Luphia) Content Layout */}
        <div className="w-full px-16 flex-1 grid grid-cols-12 gap-10 items-start pb-8">

          {/* Info: (20260130 - Luphia) Left: Product Visual (Col 5) */}
          <div className="col-span-5 relative h-full flex flex-col justify-start pt-20">
            {/* Info: (20260130 - Luphia) Device Mockup */}
            <div className="w-full aspect-[4/3] bg-gradient-to-b from-slate-200 to-slate-100 rounded-[2rem] shadow-2xl border border-white/50 relative overflow-hidden group">

              {/* Info: (20260130 - Luphia) Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl"></div>

              {/* Info: (20260130 - Luphia) Product Image */}
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <Image
                  src="https://isuncloud.com/_next/image?url=%2Fasus_ascent_gx10.png&w=1080&q=75"
                  alt="ASUS Ascent GX10"
                  fill
                  className="object-contain drop-shadow-xl p-6"
                />
              </div>

              {/* Info: (20260130 - Luphia) Specs Overlay - Adjusted for visibility on light/image background */}
              <div className="absolute bottom-4 right-4 z-20">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white/80 backdrop-blur-md rounded-lg border border-white/50 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-[9px] font-bold text-slate-700">Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info: (20260130 - Luphia) Right: Specs & Features (Col 7) */}
          <div className="col-span-7 flex flex-col gap-5 pt-20">

            {/* Info: (20260130 - Luphia) Privacy Feature Highlight */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-5 rounded-2xl flex gap-4 items-start shadow-sm">
              <div className="p-2.5 bg-white rounded-xl shadow-sm text-orange-600 shrink-0">
                <ShieldCheck size={24} strokeWidth={2} />
              </div>
              <div>
                <h4 className="font-bold text-orange-900 text-base mb-1">資料隱私與安全 (Data Privacy & Security)</h4>
                <p className="text-orange-800/80 text-xs leading-relaxed font-medium">
                  <span className="bg-white/50 px-1 rounded">數據不離地</span> — 確保敏感金融資料絕對安全。在完全合規 (Compliance) 的前提下，於機構內部本地運行先進的基礎模型，無需上傳至公有雲。
                </p>
              </div>
            </div>

            {/* Info: (20260130 - Luphia) Specs Grid */}
            <div className="grid grid-cols-2 gap-3">
              {specs.map((spec, i) => (
                <div key={i} className={`bg-white p-3.5 rounded-xl border ${spec.border} shadow-sm hover:shadow-md transition-all duration-300 flex items-start gap-3 group hover:-translate-y-0.5`}>
                  <div className={`w-10 h-10 rounded-lg ${spec.bg} ${spec.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    <spec.icon size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5 line-clamp-1">
                      {spec.label}
                    </div>
                    <div className="text-sm font-bold text-gray-900 mb-0.5 tracking-tight line-clamp-1">{spec.value}</div>
                    <div className="text-[10px] text-gray-500 font-medium leading-tight">{spec.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Info: (20260130 - Luphia) Additional Badge */}
            <div className="flex gap-3 mt-1">
              <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-mono border border-slate-200">
                <Lock size={10} />
                <span>Enterprise Grade Security</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-mono border border-slate-200">
                <Server size={10} />
                <span>On-Premise Ready</span>
              </div>
            </div>

          </div>

        </div>

        {/* Info: (20260130 - Luphia) Footer */}
        <div className="absolute bottom-4 w-full px-16 flex justify-between text-gray-400 text-xs tracking-widest uppercase font-medium">
          <div>Powered by NVIDIA & ASUS</div>
          <div className="flex gap-2 items-center">
            <div className="w-2 h-2 rounded-full bg-orange-400"></div>
            2026 CAFECA Fintech
          </div>
        </div>
      </div>
    </div>
  );
}
