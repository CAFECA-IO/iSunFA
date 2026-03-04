'use client'

import React from 'react';
import Image from 'next/image';
import { Server, Zap, ShieldCheck, HardDrive, BarChart4 } from 'lucide-react';

export default function GreenAccountingSlide5() {
  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-4 font-sans">
      <div className="w-[1280px] h-[720px] bg-neutral-950 relative overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-neutral-800 text-white">

        {/* Info: (20260212 - Luphia) Background Gloomier but with Emerald hints for solution */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[40%] h-[40%] bg-emerald-900/10 blur-[100px] rounded-full" />
          <div className="absolute bottom-0 right-1/4 w-[40%] h-[40%] bg-teal-900/10 blur-[100px] rounded-full" />
          {/* Info: (20260212 - Luphia) Grid Pattern */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none"></div>
        </div>

        <div className="z-10 w-full max-w-6xl px-12 flex flex-col h-full py-12">

          {/* Info: (20260212 - Luphia) Title Section */}
          <div className="mb-12 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-xs font-bold tracking-widest uppercase">Solution</span>
            </div>
            <h2 className="text-5xl font-extrabold tracking-tight text-white">
              iSunFA 企業淨零智能導入方案
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mx-auto mt-4" />
          </div>

          {/* Info: (20260212 - Luphia) 3 Featured Cards */}
          <div className="grid grid-cols-3 gap-8 flex-1 items-center">

            {/* Info: (20260212 - Luphia) Feature 1: AI Computing Center */}
            <div className="group relative bg-neutral-900/40 border border-white/10 p-8 rounded-3xl h-[400px] backdrop-blur-xl hover:border-emerald-500/50 hover:bg-neutral-900/60 transition-all duration-500 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                <Server className="text-emerald-400 w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-emerald-300">企業專屬 AI 算力中心</h3>
              <ul className="text-neutral-400 leading-relaxed text-sm space-y-3 text-left w-full px-4">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>資料落地保存，不出公司大門</span>
                </li>
                <li className="flex items-start gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>採用金融級加密技術</span>
                </li>
              </ul>
            </div>

            {/* Info: (20260212 - Luphia) Feature 2: All-in-One */}
            <div className="group relative bg-neutral-900/40 border border-white/10 rounded-3xl h-[400px] backdrop-blur-xl hover:border-emerald-500/50 transition-all duration-500 overflow-hidden">
              {/* Full Background Image */}
              <div className="absolute inset-0 z-0">
                <Image
                  src="/images/hardware_lease.png"
                  alt="iSunFA Hardware"
                  fill
                  className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-900/60 to-transparent" />
              </div>

              <div className="relative z-10 flex flex-col items-center justify-end h-full p-8 text-center">
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-emerald-300">一機搞定</h3>
                <p className="text-neutral-300 leading-relaxed text-sm mb-6">
                  專人到府安裝，隨插即用。
                </p>
                <div className="px-4 py-2 bg-emerald-500/20 rounded-full border border-emerald-500/30 backdrop-blur-md">
                  <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">All-in-One</span>
                </div>
              </div>
            </div>

            {/* Info: (20260212 - Luphia) Feature 3: High Efficiency */}
            <div className="group relative bg-neutral-900/40 border border-white/10 p-8 rounded-3xl h-[400px] backdrop-blur-xl hover:border-emerald-500/50 hover:bg-neutral-900/60 transition-all duration-500 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                <Zap className="text-emerald-400 w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-emerald-300">高效穩定</h3>
              <ul className="text-neutral-400 leading-relaxed text-sm space-y-3 text-left w-full px-4">
                <li className="flex items-start gap-2">
                  <BarChart4 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>不限憑證數量、不限報表產出量</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>效能專屬於您</span>
                </li>
              </ul>
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
