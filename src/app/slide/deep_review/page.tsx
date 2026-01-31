'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, MonitorPlay, Download, Grid, Maximize2 } from 'lucide-react';
import Link from 'next/link';
import DeepReviewSlide1 from '@/app/slide/deep_review/1/page';
import DeepReviewSlide2 from '@/app/slide/deep_review/2/page';
import DeepReviewSlide3 from '@/app/slide/deep_review/3/page';
import DeepReviewSlide4 from '@/app/slide/deep_review/4/page';
import DeepReviewSlide5 from '@/app/slide/deep_review/5/page';
import DeepReviewSlide6 from '@/app/slide/deep_review/6/page';
import DeepReviewSlide7 from '@/app/slide/deep_review/7/page';
import DeepReviewSlide8 from '@/app/slide/deep_review/8/page';
import DeepReviewSlide9 from '@/app/slide/deep_review/9/page';
import DeepReviewSlide10 from '@/app/slide/deep_review/10/page';
import DeepReviewSlide11 from '@/app/slide/deep_review/11/page';
import DeepReviewSlide12 from '@/app/slide/deep_review/12/page';
import DeepReviewSlide13 from '@/app/slide/deep_review/13/page';
import DeepReviewSlide14 from '@/app/slide/deep_review/14/page';
import DeepReviewSlide15 from '@/app/slide/deep_review/15/page';
import DeepReviewSlide16 from '@/app/slide/deep_review/16/page';
import DeepReviewSlide17 from '@/app/slide/deep_review/17/page';
import DeepReviewSlide18 from '@/app/slide/deep_review/18/page';
import DeepReviewSlide19 from '@/app/slide/deep_review/19/page';
import DeepReviewSlide20 from '@/app/slide/deep_review/20/page';
import DeepReviewSlide21 from '@/app/slide/deep_review/21/page';

export default function DeepReviewSlideBrowser() {
  const [currentSlide, setCurrentSlide] = useState(1);
  const totalSlides = 21;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Info: (20260121 - Luphia) Dynamic scaling logic
  const [mobileScale, setMobileScale] = useState(0.3);

  useEffect(() => {
    const handleResize = () => {
      // Info: (20260121 - Luphia) Desktop Preview Calc
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const targetWidth = 1280;
        const targetHeight = 720;
        const scaleX = width / targetWidth;
        const scaleY = height / targetHeight;
        const newScale = Math.min(scaleX, scaleY);
        setScale(newScale);
      }

      // Info: (20260121 - Luphia) Mobile List Calc
      if (window.innerWidth < 768) {
        /**
         * Info: (20260121 - Luphia) Mobile Width usually < 768. 
         * We want to fit 1280px into window width (minus details?)
         * Let's assume full width minus some padding
         */
        const w = window.innerWidth;
        const targetW = 1280;
        setMobileScale(w / targetW);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Info: (20260121 - Luphia) Slide Components Map
  const SlideComponents: { [key: number]: React.ComponentType } = {
    1: DeepReviewSlide1,
    2: DeepReviewSlide2,
    3: DeepReviewSlide3,
    4: DeepReviewSlide4,
    5: DeepReviewSlide5,
    6: DeepReviewSlide6,
    7: DeepReviewSlide7,
    8: DeepReviewSlide8,
    9: DeepReviewSlide9,
    10: DeepReviewSlide10,
    11: DeepReviewSlide11,
    12: DeepReviewSlide12,
    13: DeepReviewSlide13,
    14: DeepReviewSlide14,
    15: DeepReviewSlide15,
    16: DeepReviewSlide16,
    17: DeepReviewSlide17,
    18: DeepReviewSlide18,
    19: DeepReviewSlide19,
    20: DeepReviewSlide20,
    21: DeepReviewSlide21,
  };

  const CurrentSlideComponent = SlideComponents[currentSlide];

  // Info: (20260121 - Luphia) Based on recent implementation context:
  const slideTitles: { [key: number]: string } = {
    1: 'Cover: DeepReview',
    2: 'Services',
    3: 'Pain Points',
    4: 'Solution',
    5: 'Issue Management',
    6: 'Product Management',
    7: 'Committee Settings',
    8: 'Strategy Meeting',
    9: 'Competitor Analysis',
    10: 'Trinity Architecture',
    11: 'Operational Flow',
    12: 'Deployment & Strategy',
    13: 'Case: IRSC Rating',
    14: 'DeepReview Core Values',
    15: 'Local Execution',
    16: 'Rapid Fine-tuning',
    17: 'Our Advantages (Validation)',
    18: 'Our Advantages (Data & Model)',
    19: 'Why Choose Us',
    20: 'Regulatory Sandbox',
    21: 'Thank You',
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
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-white overflow-hidden">

      {/* Info: (20260121 - Luphia) Universal Header */}
      <div className="h-14 border-b border-neutral-800 flex items-center justify-between px-4 bg-neutral-900 z-20 flex-shrink-0">
        <Link href="/slide" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="bg-orange-600 p-1.5 rounded-lg">
            <MonitorPlay size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-200">DeepReview Presentation</h1>
            <p className="text-xs text-gray-500">v1.2.0 • 2026 CAFECA</p>
          </div>
        </Link>

        {/* Info: (20260121 - Luphia) Desktop Controls - Hidden on Mobile */}
        <div className="hidden md:flex items-center gap-2">
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

        {/* Info: (20260121 - Luphia) Right Side Actions - Visible on both but adjusted */}
        <div className="flex items-center gap-3">
          <Link href="/slide/deep_review/print" target="_blank" className="hidden md:block">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-md text-xs font-medium transition-colors border border-neutral-700">
              <Download size={14} />
              <span>PDF</span>
            </button>
          </Link>
          <Link href={`/slide/deep_review/${currentSlide}`} target="_blank" className="hidden md:block">
            <button className="p-2 hover:bg-neutral-800 rounded-md text-gray-400 hover:text-white transition-colors">
              <Maximize2 size={18} />
            </button>
          </Link>
        </div>
      </div>

      {/* Info: (20260121 - Luphia) Mobile Vertical Scroll View - Visible only on mobile */}
      <div
        className="md:hidden flex-1 overflow-y-auto bg-neutral-900 scroll-smooth"
        onScroll={(e) => {
          const target = e.currentTarget;
          const containerCenter = target.getBoundingClientRect().top + (target.clientHeight / 2);

          // Info: (20260121 - Luphia) Get the inner wrapper that holds all slides
          const innerWrapper = target.firstElementChild as HTMLElement;
          if (!innerWrapper) return;

          let closestSlideIndex = 1;
          let minDistance = Infinity;

          // Info: (20260130 - Luphia) Iterate through children to find closest to center
          Array.from(innerWrapper.children).forEach((child, index) => {
            const rect = child.getBoundingClientRect();
            const childCenter = rect.top + (rect.height / 2);
            const dist = Math.abs(containerCenter - childCenter);

            if (dist < minDistance) {
              minDistance = dist;
              closestSlideIndex = index + 1; // 1-based index
            }
          });

          if (closestSlideIndex !== currentSlide) {
            setCurrentSlide(closestSlideIndex);
          }
        }}
      >
        <div className="flex flex-col items-center gap-4 py-[35vh] min-h-screen">
          {Array.from({ length: totalSlides }, (_, i) => i + 1).map((id) => {
            const distance = Math.abs(id - currentSlide);
            // Info: (20260121 - Luphia) Only load 3 slides: current +/- 1
            const shouldRender = distance <= 1;
            const isResponsive = [8].includes(id);

            /**
             * Info: (20260121 - Luphia) Visual Effects based on distance
             * 0: opacity-100 blur-0 grayscale-0
             * 1: opacity-40 blur-sm grayscale
             */
            const opacityClass = distance === 0 ? 'opacity-100 scale-100' :
              'opacity-40 scale-95 blur-[2px] grayscale';

            const Component = SlideComponents[id];

            if (isResponsive) {
              // Info: (20260130 - Luphia) Responsive Render (No Scaling)
              return (
                <div key={id} className={`w-full relative overflow-hidden transition-all duration-500 ease-out ${opacityClass}`}
                  style={{ height: 'auto', minHeight: '80vh' }}>
                  <div className="w-full h-full bg-white shadow-xl rounded-lg overflow-hidden">
                    {shouldRender ? <Component /> : <div className="w-full h-64 bg-neutral-800/50 animate-pulse" />}
                  </div>
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-full z-10 pointer-events-none transition-opacity duration-300 ${distance === 0 ? 'bg-orange-600 text-white shadow-lg' : 'bg-black/50 text-gray-400'}`}>
                    <span className="text-[10px] font-bold">{id}</span>
                    <span className="text-[8px] opacity-80">/{totalSlides}</span>
                  </div>
                </div>
              );
            }

            return (
              <div key={id} className={`w-full relative overflow-hidden transition-all duration-500 ease-out ${opacityClass}`}
                style={{ height: 720 * mobileScale }}>

                {/* Info: (20260121 - Luphia) Scale Wrapper */}
                <div
                  style={{
                    transform: `scale(${mobileScale})`,
                    transformOrigin: 'top left',
                    width: 1280,
                    height: 720
                  }}
                  className="bg-white shadow-xl rounded-lg"
                >
                  <div className="w-full h-full [&>div]:!min-h-0 [&>div]:!h-full [&>div]:!bg-transparent [&>div]:!p-0">
                    {shouldRender ? <Component /> : <div className="w-full h-full bg-neutral-800/50 animate-pulse" />}
                  </div>
                </div>

                {/* Info: (20260121 - Luphia) Overlay Page Number for Mobile */}
                <div className={`absolute top-2 right-2 px-2 py-1 rounded-full z-10 pointer-events-none transition-opacity duration-300 ${distance === 0 ? 'bg-orange-600 text-white shadow-lg' : 'bg-black/50 text-gray-400'}`}>
                  <span className="text-[10px] font-bold">{id}</span>
                  <span className="text-[8px] opacity-80">/{totalSlides}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info: (20260121 - Luphia) Desktop Layout - Hidden on Mobile */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Info: (20260121 - Luphia) Simple flex container for desktop content since header is moved out */}

        {/* Info: (20260121 - Luphia) Main Layout: Content (Left) + Navigator (Right) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Info: (20260121 - Luphia) Preview Area */}
          <div className="flex-1 bg-neutral-950 flex items-center justify-center p-8 relative overflow-hidden" ref={containerRef}>
            {/* Info: (20260121 - Luphia) Scaled Content Wrapper */}
            <div
              style={{
                transform: `scale(${scale})`,
                width: 1280,
                height: 720,
                transformOrigin: 'center center'
              }}
              className="bg-white shadow-2xl flex-shrink-0 relative overflow-hidden ring-1 ring-neutral-800"
            >
              <div className="w-full h-full [&>div]:!min-h-0 [&>div]:!h-full [&>div]:!bg-transparent [&>div]:!p-0">
                <CurrentSlideComponent />
              </div>
            </div>
          </div>

          {/* Info: (20260121 - Luphia) Side Navigator (Right) */}
          <div className="w-64 border-l border-neutral-800 bg-neutral-900 flex flex-col flex-shrink-0">
            <div className="px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800">
              <Grid size={12} />
              <span>Navigator</span>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 scrollbar-hide">
              {Array.from({ length: totalSlides }, (_, i) => i + 1).map((id) => (
                <button
                  key={id}
                  onClick={() => goToSlide(id)}
                  className={`flex-shrink-0 w-full aspect-video rounded-lg border-2 transition-all duration-200 relative group overflow-hidden ${currentSlide === id
                    ? 'border-orange-500 ring-2 ring-orange-500/20'
                    : 'border-neutral-800 hover:border-neutral-700 opacity-60 hover:opacity-100'
                    }`}
                >
                  {/* Info: (20260121 - Luphia) Mini Preview Mock */}
                  <div className="absolute inset-0 bg-white">
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300 text-xs font-mono">
                      LOGO
                    </div>
                    {/* Info: (20260121 - Luphia) Overlay Title */}
                    <div className="absolute bottom-0 inset-x-0 bg-neutral-900/90 p-2 text-left">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[10px] font-bold text-orange-500">#{id.toString().padStart(2, '0')}</span>
                      </div>
                      <div className="text-[10px] text-gray-300 font-medium truncate leading-tight">{slideTitles[id] || `Slide ${id}`}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
