"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { toJpeg } from "html-to-image";
import { Download } from "lucide-react";

export default function CafecaDeskBoard() {
  const [isExporting, setIsExporting] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  const exportPoster = async () => {
    if (!posterRef.current || isExporting) return;
    setIsExporting(true);

    try {
      const width = posterRef.current.offsetWidth;
      const height = posterRef.current.offsetHeight;
      const targetWidth = 4120; // Info: (20260604 - Luphia) 103cm at 40 pixels/cm (approx 100 DPI)
      const targetHeight = 4000; // Info: (20260604 - Luphia) 100cm at 40 pixels/cm (approx 100 DPI)

      const dataUrl = await toJpeg(posterRef.current, {
        quality: 0.95,
        width: targetWidth,
        height: targetHeight,
        style: {
          transform: `scale(${targetWidth / width})`,
          transformOrigin: "top left",
          width: `${width}px`,
          height: `${height}px`,
        },
        cacheBust: true,
      });

      const link = document.createElement("a");
      link.download = "iSunFA_Desk_Board_103x100cm.jpg";
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to export image:", error);
    } finally {
      setIsExporting(false);
    }
  };
  return (
    <div className="flex min-h-screen w-full items-start justify-center overflow-y-auto bg-slate-50 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-[size:24px_24px] p-6 font-sans text-slate-800 md:p-12">
      {/* Info: (20260604 - Luphia) Background Ambient Warm Glows (Static) */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-[600px] w-[600px] rounded-full bg-orange-500/5 blur-[120px]" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/3 h-[500px] w-[500px] rounded-full bg-amber-500/5 blur-[120px]" />
      <div className="pointer-events-none absolute top-10 right-10 h-96 w-96 rounded-full bg-orange-600/3 blur-[100px]" />

      {/* Info: (20260604 - Luphia) The Poster Container (103cm x 100cm aspect ratio 103:100) */}
      <div
        ref={posterRef}
        className="relative flex aspect-[103/100] w-full max-w-[103vh] shrink-0 flex-col items-center justify-center gap-12 overflow-hidden border border-slate-200/80 bg-white p-16 text-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.08)]"
      >
        {/* Info: (20260604 - Luphia) Poster Grid Guide Lines Overlay (Subtle warm gray) */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:100px_100px] opacity-60" />

        {/* Info: (20260604 - Luphia) Watercolor-style soft orange/amber ambient glow inside the poster */}
        <div className="pointer-events-none absolute top-[-10%] left-[20%] h-[60%] w-[60%] rounded-full bg-orange-300/8 blur-[100px]" />
        <div className="pointer-events-none absolute right-[10%] bottom-[-10%] h-[50%] w-[50%] rounded-full bg-amber-300/6 blur-[120px]" />
        <div className="pointer-events-none absolute top-[30%] left-[40%] h-[40%] w-[40%] rounded-full bg-orange-200/5 blur-[90px]" />

        {/* Info: (20260604 - Luphia) Content Centered */}
        <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-8 select-text">
          {/* Info: (20260604 - Luphia) Logo enlarged 4x (Standard logo is h-8, enlarged 4x is h-32) */}
          <div className="flex items-center justify-center p-4">
            <Image
              src="/isunfa_logo_color.svg"
              alt="iSunFA Logo"
              width={500}
              height={128}
              className="h-32 w-auto"
              priority
              unoptimized
            />
          </div>

          {/* Info: (20260604 - Luphia) Slogan Text Centered */}
          <div className="mt-4 text-center">
            <h2 className="bg-gradient-to-r from-orange-700 via-orange-600 to-amber-500 bg-clip-text text-[54px] leading-[1.3] font-extrabold tracking-wide text-transparent">
              解決財務會計與溫室
              <br />
              氣體盤查大小事
            </h2>
          </div>
        </div>

        {/* Info: (20260604 - Luphia) Decorative divider line at the bottom */}
        <div className="absolute right-16 bottom-12 left-16 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
      </div>

      {/* Info: (20260604 - Luphia) Floating Download Button */}
      <button
        onClick={exportPoster}
        disabled={isExporting}
        className="fixed right-6 bottom-6 z-20 flex items-center gap-2 rounded-full border border-orange-400/20 bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-3 font-bold text-white shadow-[0_0_20px_rgba(234,88,12,0.3)] transition-all duration-300 hover:scale-105 hover:from-orange-700 hover:to-amber-600 active:scale-95 disabled:opacity-50"
      >
        {isExporting ? (
          <>
            <span className="mr-1 inline-block animate-spin">🌀</span>
            Exporting JPG...
          </>
        ) : (
          <>
            <Download size={18} />
            下載 103x100cm JPG
          </>
        )}
      </button>
    </div>
  );
}
