"use client";

import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import { toJpeg } from "html-to-image";
import {
  Layers,
  Globe,
  Zap,
  QrCode,
  Users,
  Mail,
  Download,
} from "lucide-react";

// Info: (20260603 - Luphia) HexagonIcon component matching the design, updated default color to orange-600
const HexagonIcon = ({
  children,
  color = "text-orange-600",
}: {
  children: React.ReactNode;
  color?: string;
}) => {
  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
      <svg
        className={`absolute inset-0 h-full w-full ${color}`}
        viewBox="0 0 100 100"
        fill="currentColor"
        fillOpacity="0.06"
      >
        <polygon
          points="50,5 88.97,27.5 88.97,72.5 50,95 11.03,72.5 11.03,27.5"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className={`relative z-10 ${color}`}>{children}</div>
    </div>
  );
};

/**
 * Info: (20260603 - Luphia)
 * Custom hook to load the CAFECA logo, crop the bottom 30% to remove low-res subline,
 * and paint the text portion to a dark slate color (rgb(30, 41, 59)) for light theme.
 */
function useProcessedLogo(initialSrc: string = "/images/cafeca_logo.png") {
  const [logoSrc, setLogoSrc] = useState<string>(initialSrc);

  useEffect(() => {
    const img = new window.Image();
    img.src = initialSrc;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      // Crop the bottom 30% of the image to remove the low-resolution blue subline text inside the PNG
      canvas.height = Math.round(img.height * 0.7);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw the full logo image (bottom part will be clipped)
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Logo text starts after the emblem (about 30% width)
      const splitX = Math.round(canvas.width * 0.3);

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          if (x >= splitX) {
            const index = (y * canvas.width + x) * 4;
            const alpha = data[index + 3];
            if (alpha > 0) {
              // Color text dark slate rgb(30, 41, 59)
              data[index] = 30; // R
              data[index + 1] = 41; // G
              data[index + 2] = 59; // B
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      setLogoSrc(canvas.toDataURL());
    };
  }, [initialSrc]);

  return logoSrc;
}

export default function CafecaBackBoard() {
  const logoSrc = useProcessedLogo();
  const [isExporting, setIsExporting] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  const exportPoster = async () => {
    if (!posterRef.current || isExporting) return;
    setIsExporting(true);

    try {
      const width = posterRef.current.offsetWidth;
      const height = posterRef.current.offsetHeight;
      const targetWidth = 5400; // Info: (20260603 - Luphia) 135cm at 40 pixels/cm (approx 100 DPI)
      const targetHeight = 4800; // Info: (20260603 - Luphia) 120cm at 40 pixels/cm (approx 100 DPI)

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
      link.download = "CAFECA_Exhibition_Poster_135x120cm.jpg";
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
  useEffect(() => {
    if (logoSrc === "/images/cafeca_logo.png") return;
    const timer = setTimeout(async () => {
      try {
        const poster =
          document.querySelector(".aspect-\\[135\\/120\\]") ||
          document.getElementById("poster-container");
        if (!poster) {
          console.error("Poster not found");
          return;
        }
        const mainContainer = poster.parentElement;
        if (!mainContainer) {
          console.error("Main container not found");
          return;
        }
        poster.id = "poster-container";

        let cssText = "";
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            const rules = sheet.cssRules || sheet.rules;
            if (!rules) continue;
            for (const rule of Array.from(rules)) {
              cssText += rule.cssText + "\n";
            }
          } catch (e) {
            console.warn("Could not read stylesheet rules: ", e);
          }
        }

        const containerClone = mainContainer.cloneNode(true) as HTMLElement;
        const btnClone = containerClone.querySelector("button");
        if (btnClone) {
          btnClone.id = "download-btn";
          btnClone.removeAttribute("disabled");
        }

        const cleanHtml = containerClone.outerHTML;

        const finalHtml = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CAFECA - Backboard Poster</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&family=Geist:wght@100..900&display=swap" rel="stylesheet">
  <style>
    ${cssText}
    body {
      font-family: 'Geist', 'Geist Mono', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 antialiased overflow-x-hidden">
  ${cleanHtml}
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const poster = document.getElementById('poster-container');
      const btn = document.getElementById('download-btn');
      
      if (poster && btn) {
        let isExporting = false;
        btn.addEventListener('click', async () => {
          if (isExporting) return;
          isExporting = true;
          btn.disabled = true;
          const originalContent = btn.innerHTML;
          btn.innerHTML = '<span class="inline-block animate-spin mr-1">🌀</span> Exporting JPG...';
          
          try {
            const width = poster.offsetWidth;
            const height = poster.offsetHeight;
            const targetWidth = 5400;
            const targetHeight = 4800;
            
            const dataUrl = await htmlToImage.toJpeg(poster, {
              quality: 0.95,
              width: targetWidth,
              height: targetHeight,
              style: {
                transform: 'scale(' + (targetWidth / width) + ')',
                transformOrigin: 'top left',
                width: width + 'px',
                height: height + 'px'
              },
              cacheBust: true,
            });
            
            const link = document.createElement("a");
            link.download = "CAFECA_Exhibition_Poster_135x120cm.jpg";
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } catch (error) {
            console.error("Failed to export image:", error);
            alert("Failed to export image. Please try again. " + error.message);
          } finally {
            isExporting = false;
            btn.disabled = false;
            btn.innerHTML = originalContent;
          }
        });
      }
    });
  </script>
</body>
</html>`;

        console.log("Sending compiled HTML to receiver...");
        const response = await fetch("http://localhost:3001/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: "back_board.html",
            html: finalHtml,
          }),
        });
        const resJson = await response.json();
        console.log("Receiver response:", resJson);
      } catch (err) {
        console.error("Error auto-exporting:", err);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [logoSrc]);

  return (
    <div className="flex min-h-screen w-full items-start justify-center overflow-y-auto bg-slate-50 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-[size:24px_24px] p-6 font-sans text-slate-800 md:p-12">
      {/* Info: (20260603 - Luphia) Background Ambient Warm Glows (Static) */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-[600px] w-[600px] rounded-full bg-orange-500/5 blur-[120px]" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/3 h-[500px] w-[500px] rounded-full bg-amber-500/5 blur-[120px]" />
      <div className="pointer-events-none absolute top-10 right-10 h-96 w-96 rounded-full bg-orange-600/3 blur-[100px]" />

      <div
        ref={posterRef}
        className="relative flex aspect-[135/120] w-full max-w-[112.5vh] shrink-0 flex-col justify-start gap-10 overflow-hidden border border-slate-200/80 bg-white p-16 pb-[30%] text-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.08)]"
      >
        {/* Info: (20260603 - Luphia) Poster Grid Guide Lines Overlay (Subtle warm gray) */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:100px_100px] opacity-60" />

        {/* Info: (20260603 - Luphia) Watercolor-style soft orange/amber ambient glow inside the poster */}
        <div className="pointer-events-none absolute top-[-10%] left-[20%] h-[60%] w-[60%] rounded-full bg-orange-300/8 blur-[100px]" />
        <div className="pointer-events-none absolute right-[10%] bottom-[-10%] h-[50%] w-[50%] rounded-full bg-amber-300/6 blur-[120px]" />
        <div className="pointer-events-none absolute top-[30%] left-[40%] h-[40%] w-[40%] rounded-full bg-orange-200/5 blur-[90px]" />

        {/* Info: (20260603 - Luphia) TOP SECTION */}
        <div className="relative z-10 flex flex-col gap-4 select-text">
          {/* Info: (20260603 - Luphia) Logo & Subtext */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-4 py-2">
                <Image
                  src={logoSrc}
                  alt="CAFECA Logo"
                  width={110}
                  height={33}
                  className="h-[33px] w-auto"
                  unoptimized
                />
              </div>
              <span className="pl-1 font-sans text-[10px] font-semibold tracking-[0.2em] text-orange-600/90 uppercase md:text-[14px]">
                Carbon Accounting, Footprint & Emission Compliance AI
              </span>
            </div>
          </div>

          {/* Info: (20260603 - Luphia) Slogan */}
          <div className="mt-1">
            <h2 className="bg-gradient-to-r from-orange-700 via-orange-600 to-amber-500 bg-clip-text text-[40px] leading-[1.2] font-extrabold tracking-wide text-transparent">
              AI 驅動，一站式解決您的碳足跡與永續合規
            </h2>
            <p className="mt-2 max-w-5xl pl-0.5 text-lg leading-relaxed font-normal tracking-wide text-slate-600">
              從碳盤查到數位產品護照，企業邁向淨零的最強人工智能碳會計引擎。
            </p>
          </div>
        </div>

        {/* Info: (20260603 - Luphia) MIDDLE SECTION */}
        <div className="relative z-10 grid grid-cols-12 items-stretch gap-8 select-text">
          {/* Info: (20260603 - Luphia) Left Panel: Visual Area (Dedicated QR Scan Area + Contact Links) */}
          <div className="relative col-span-5 flex flex-col">
            <div className="flex w-full flex-grow flex-col items-center justify-between rounded-3xl border border-slate-200/60 bg-slate-50/50 p-8 text-center shadow-lg backdrop-blur-md">
              {/* Info: (20260603 - Luphia) Subtitle / Header Text inside Panel */}
              <div className="mt-2 text-xs leading-relaxed font-semibold tracking-wider text-orange-600">
                數據自動匯入 ➔ AI 智能運算 ➔ 一鍵生成合規報告
              </div>

              {/* Info: (20260603 - Luphia) Large High-Contrast QR Code Card */}
              <div className="my-6 flex items-center justify-center rounded-3xl border border-orange-100/80 bg-white p-5 shadow-sm">
                <QRCodeSVG value="https://isunfa.com" size={150} level="H" />
              </div>

              {/* Info: (20260603 - Luphia) CTA and Contact Info inside Panel */}
              <div className="flex w-full flex-col items-center">
                <h3 className="flex items-center justify-center gap-2 text-base font-bold tracking-wider text-slate-800">
                  立即掃描，免費體驗
                </h3>

                <div className="my-3 h-px w-full bg-slate-200" />

                {/* Info: (20260603 - Luphia) Aligned Contact Links */}
                <div className="flex items-center justify-center gap-4 font-mono text-[10px] text-slate-500">
                  <a
                    href="https://isunfa.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 transition-colors hover:text-orange-600"
                  >
                    <Globe size={11} className="text-orange-500" />
                    <span>isunfa.com</span>
                  </a>
                  <span className="text-slate-300">|</span>
                  <a
                    href="mailto:contact@cafeca.com.tw"
                    className="flex items-center gap-1.5 transition-colors hover:text-orange-600"
                  >
                    <Mail size={11} className="text-orange-500" />
                    <span>contact@cafeca.com.tw</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Info: (20260603 - Luphia) Pill Border Badge */}
            <div className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-orange-600 px-5 py-1 text-[11px] font-bold tracking-wider text-white uppercase shadow-sm">
              掃描體驗
            </div>
          </div>

          {/* Info: (20260603 - Luphia) Right Panel: Services Area */}
          <div className="relative col-span-7 flex flex-col">
            <div className="flex w-full flex-grow flex-col justify-between gap-5 rounded-3xl border border-slate-200/60 bg-slate-50/50 p-8 shadow-lg backdrop-blur-md">
              {/* Info: (20260603 - Luphia) Service 1 */}
              <div className="flex items-center gap-5">
                <HexagonIcon color="text-orange-600">
                  <Layers size={22} />
                </HexagonIcon>
                <div className="flex-grow">
                  <h3 className="text-base font-bold text-slate-800">
                    組織碳盤查 ISO 14064-1
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    AI 自動辨識活動數據，無痛生成溫室氣體盤查清冊。
                  </p>
                </div>
              </div>

              {/* Info: (20260603 - Luphia) Service 2 */}
              <div className="flex items-center gap-5">
                <HexagonIcon color="text-orange-600">
                  <Globe size={22} />
                </HexagonIcon>
                <div className="flex-grow">
                  <h3 className="text-base font-bold text-slate-800">
                    產品碳足跡 ISO 14067
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    建立搖籃到墳墓碳模型，輕鬆應對國際供應鏈要求。
                  </p>
                </div>
              </div>

              {/* Info: (20260603 - Luphia) Service 3 */}
              <div className="flex items-center gap-5">
                <HexagonIcon color="text-orange-600">
                  <Zap size={22} />
                </HexagonIcon>
                <div className="flex-grow">
                  <h3 className="text-base font-bold text-slate-800">
                    淨零排放專案 ISO 14064-2
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    量化減碳專案成效，為碳權申請與淨零宣告建立基石。
                  </p>
                </div>
              </div>

              {/* Info: (20260603 - Luphia) Service 4 */}
              <div className="flex items-center gap-5">
                <HexagonIcon color="text-orange-600">
                  <QrCode size={22} />
                </HexagonIcon>
                <div className="flex-grow">
                  <h3 className="text-base font-bold text-slate-800">
                    數位產品護照 (DPP)
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    超前部署歐盟法規，雲端生成產品專屬透明綠色履歷。
                  </p>
                </div>
              </div>

              {/* Info: (20260603 - Luphia) Service 5 */}
              <div className="flex items-center gap-5">
                <HexagonIcon color="text-orange-600">
                  <Users size={22} />
                </HexagonIcon>
                <div className="flex-grow">
                  <h3 className="text-base font-bold text-slate-800">
                    永續供應鏈 ISO 20400
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    供應商協作管理平台，一網打盡採購端 ESG 指標。
                  </p>
                </div>
              </div>
            </div>

            {/* Info: (20260603 - Luphia) Pill Border Badge */}
            <div className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-orange-600 px-5 py-1 text-[11px] font-bold tracking-wider text-white uppercase shadow-sm">
              提供服務
            </div>
          </div>
        </div>

        {/* Info: (20260603 - Luphia) Decorative divider line separating content from the lower safety zone */}
        <div className="relative z-10 mt-4 h-px w-full bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
      </div>

      {/* Info: (20260603 - Luphia) Floating Download Button */}
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
            下載 135x120cm JPG
          </>
        )}
      </button>
    </div>
  );
}
