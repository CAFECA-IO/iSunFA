'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, MonitorPlay, Download, Grid, Maximize2 } from 'lucide-react';
import Link from 'next/link';

export default function DeepInsightSlideBrowser() {
  const [currentSlide, setCurrentSlide] = useState(1);
  const totalSlides = 17;

  // Info: (20260121 - Luphia) Based on recent implementation context:
  const slideTitles: { [key: number]: string } = {
    1: 'Cover: DeepInsight',
    2: 'Services Overview',
    3: 'Limitations',
    4: 'Solution',
    5: 'Quick Demo',
    6: 'Trinity Architecture',
    7: 'Operational Flow',
    8: 'Deployment Strategy',
    9: 'Case: IRSC Rating',
    10: 'Case: IRSC Rating',
    11: 'Case: MarketPulse',
    12: 'Core Values',
    13: 'Our Advantages',
    14: 'Data & Model',
    15: 'Why Choose Us',
    16: 'Regulatory Sandbox',
    17: 'Thank You',
  };

  const nextSlide = useCallback(() => {
    setCurrentSlide(c => (c < totalSlides ? c + 1 : c));
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlide(c => (c > 1 ? c - 1 : c));
  }, []);

  const goToSlide = (id: number) => {
    setCurrentSlide(id);
  };

  // Info: (20260121 - Luphia) Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-white overflow-hidden">
      {/* Info: (20260121 - Luphia) Top Bar */}
      <div className="h-14 border-b border-neutral-800 flex items-center justify-between px-4 bg-neutral-900 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-1.5 rounded-lg">
            <MonitorPlay size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-200">DeepInsight Presentation</h1>
            <p className="text-xs text-gray-500">v1.2.0 • 2026 iSunFA</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-500 mr-2">
            {currentSlide} / {totalSlides}
          </span>
          <button
            onClick={prevSlide}
            disabled={currentSlide === 1}
            className="p-2 hover:bg-neutral-800 rounded-full disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={nextSlide}
            disabled={currentSlide === totalSlides}
            className="p-2 hover:bg-neutral-800 rounded-full disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/slide/deep_insight/print" target="_blank">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-md text-xs font-medium transition-colors border border-neutral-700">
              <Download size={14} />
              <span>PDF</span>
            </button>
          </Link>
          <Link href={`/slide/deep_insight/${currentSlide}`} target="_blank">
            <button className="p-2 hover:bg-neutral-800 rounded-md text-gray-400 hover:text-white transition-colors">
              <Maximize2 size={18} />
            </button>
          </Link>
        </div>
      </div>

      {/* Info: (20260121 - Luphia) Main Content Area (iframe) */}
      <div className="flex-1 bg-neutral-950 flex items-center justify-center p-8 relative">
        <div className="relative w-full h-full max-w-[1280px] max-h-[760px] shadow-2xl overflow-hidden rounded-lg bg-white ring-1 ring-neutral-800">
          {/* Info: (20260121 - Luphia) Using key to force re-render if needed, but src change is usually enough */}
          <iframe
            src={`/slide/deep_insight/${currentSlide}`}
            className="w-full h-full border-0"
            title="Slide Preview"
          />
        </div>
      </div>

      {/* Info: (20260121 - Luphia) Bottom Thumbnail Strip */}
      <div className="h-40 border-t border-neutral-800 bg-neutral-900 flex flex-col">
        <div className="px-4 py-2 text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-2">
          <Grid size={12} />
          Slide Navigator
        </div>
        <div className="flex-1 overflow-x-auto flex items-center gap-3 px-4 pb-4 scrollbar-hide">
          {Array.from({ length: totalSlides }, (_, i) => i + 1).map((id) => (
            <button
              key={id}
              onClick={() => goToSlide(id)}
              className={`flex-shrink-0 w-48 h-28 rounded-lg border-2 transition-all duration-200 relative group overflow-hidden ${currentSlide === id
                ? 'border-orange-500 ring-2 ring-orange-500/20'
                : 'border-neutral-800 hover:border-neutral-700 opacity-60 hover:opacity-100'
                }`}
            >
              {/* Info: (20260121 - Luphia) Mini Preview Mock - Using iframe is too heavy, just use a placeholder styling */}
              <div className="absolute inset-0 bg-white">
                <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300 text-xs font-mono">
                  LOGO
                </div>
                {/* Info: (20260121 - Luphia) Overlay Title */}
                <div className="absolute bottom-0 inset-x-0 bg-neutral-900/90 p-2 text-left">
                  <div className="text-[10px] font-bold text-orange-500 mb-0.5">#{id.toString().padStart(2, '0')}</div>
                  <div className="text-[10px] text-gray-300 font-medium truncate">{slideTitles[id] || `Slide ${id}`}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
