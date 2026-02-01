
'use client';

import { useState } from 'react';
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
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { Download, Loader2 } from 'lucide-react';

export default function DeepReviewPrint() {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    const zip = new JSZip();
    const slidePages = document.querySelectorAll('.slide-page');

    try {
      for (let i = 0; i < slidePages.length; i++) {
        const page = slidePages[i] as HTMLElement;

        // Info: (20260131 - Luphia) Scroll into view to trigger lazy loading of images
        page.scrollIntoView({ behavior: 'instant', block: 'start' });
        // Info: Wait a bit for images to load (Next/Image lazy loading)
        await new Promise(resolve => setTimeout(resolve, 500));

        // Info: (20260131 - Luphia) Try to find the 1280x720 container
        let target = page.querySelector('.w-\\[1280px\\]') as HTMLElement;

        // Info: (20260131 - Luphia) Fallback strategies if class name is different/purged
        if (!target) {
          const root = page.firstElementChild as HTMLElement;
          if (root) {
            // Info: (20260131 - Luphia) Try to find a child with roughly the right aspect ratio or width
            for (let j = 0; j < root.children.length; j++) {
              const child = root.children[j] as HTMLElement;
              if (child.offsetWidth >= 1200) { // Info: (20260131 - Luphia) Rough check
                target = child;
                break;
              }
            }
            if (!target) target = root; // Info: (20260131 - Luphia) Last resort: capture whole component
          }
        }

        if (target) {
          // Info: (20260131 - Luphia) 2x Pixel Ratio for better quality, cacheBust for images
          const dataUrl = await toPng(target, {
            quality: 0.95,
            pixelRatio: 2,
            cacheBust: true,
            skipAutoScale: true,
            filter: (node) => {
              // Info: (20260131 - Luphia) Filter out script tags and other unwanted elements
              if (node.tagName === 'SCRIPT' || node.tagName === 'LINK') return false;
              return true;
            }
          });
          const base64 = dataUrl.split(',')[1];
          zip.file(`DeepReview_Slide_${(i + 1).toString().padStart(2, '0')}.png`, base64, { base64: true });
        }
        setProgress(Math.round(((i + 1) / slidePages.length) * 100));
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'DeepReview_Slides_PNG.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  return (
    <div className="print-container bg-white min-h-screen">
      <div className="fixed top-4 right-4 z-50 flex gap-2 print:hidden backdrop-blur-md bg-white/80 p-2 rounded-lg shadow-lg border border-gray-200">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-bold shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"
          disabled={isExporting}
        >
          Print / PDF
        </button>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-bold shadow-md hover:bg-orange-700 transition-colors flex items-center gap-2"
          disabled={isExporting}
        >
          {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
          {isExporting ? `Exporting ${progress}%` : 'Export PNGs'}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: 1280px 720px;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
          }
          .slide-page {
            break-after: page;
            page-break-after: always;
            width: 100vw;
            height: 100vh;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
        .slide-page {
           margin-bottom: 2rem;
           border: 1px dashed #ccc;
           /* Info: (20260131 - Luphia) Ensure flexible container for preview */
           display: flex;
           justify-content: center;
           padding: 1rem;
        }
        @media print {
           .slide-page {
               margin-bottom: 0;
               border: none;
               padding: 0;
           }
        }
      `}} />

      <div className="slide-page"><DeepReviewSlide1 /></div>
      <div className="slide-page"><DeepReviewSlide2 /></div>
      <div className="slide-page"><DeepReviewSlide3 /></div>
      <div className="slide-page"><DeepReviewSlide4 /></div>
      <div className="slide-page"><DeepReviewSlide5 /></div>
      <div className="slide-page"><DeepReviewSlide6 /></div>
      <div className="slide-page"><DeepReviewSlide7 /></div>
      <div className="slide-page"><DeepReviewSlide8 /></div>
      <div className="slide-page"><DeepReviewSlide9 /></div>
      <div className="slide-page"><DeepReviewSlide10 /></div>
      <div className="slide-page"><DeepReviewSlide11 /></div>
      <div className="slide-page"><DeepReviewSlide12 /></div>
      <div className="slide-page"><DeepReviewSlide13 /></div>
      <div className="slide-page"><DeepReviewSlide14 /></div>
      <div className="slide-page"><DeepReviewSlide15 /></div>
      <div className="slide-page"><DeepReviewSlide16 /></div>
      <div className="slide-page"><DeepReviewSlide17 /></div>
      <div className="slide-page"><DeepReviewSlide18 /></div>
      <div className="slide-page"><DeepReviewSlide19 /></div>
      <div className="slide-page"><DeepReviewSlide20 /></div>
      <div className="slide-page"><DeepReviewSlide21 /></div>
    </div>
  );
}
