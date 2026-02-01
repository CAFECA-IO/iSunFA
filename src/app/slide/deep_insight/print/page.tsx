
'use client';

import DeepInsightSlide1 from '@/app/slide/deep_insight/1/page';
import DeepInsightSlide2 from '@/app/slide/deep_insight/2/page';
import DeepInsightSlide3 from '@/app/slide/deep_insight/3/page';
import DeepInsightSlide4 from '@/app/slide/deep_insight/4/page';
import DeepInsightSlide5 from '@/app/slide/deep_insight/5/page';
import DeepInsightSlide6 from '@/app/slide/deep_insight/6/page';
import DeepInsightSlide7 from '@/app/slide/deep_insight/7/page';
import DeepInsightSlide8 from '@/app/slide/deep_insight/8/page';
import DeepInsightSlide9 from '@/app/slide/deep_insight/9/page';
import DeepInsightSlide10 from '@/app/slide/deep_insight/10/page';
import DeepInsightSlide11 from '@/app/slide/deep_insight/11/page';
import DeepInsightSlide12 from '@/app/slide/deep_insight/12/page';
import DeepInsightSlide13 from '@/app/slide/deep_insight/13/page';
import DeepInsightSlide14 from '@/app/slide/deep_insight/14/page';
import DeepInsightSlide15 from '@/app/slide/deep_insight/15/page';
import DeepInsightSlide16 from '@/app/slide/deep_insight/16/page';
import DeepInsightSlide17 from '@/app/slide/deep_insight/17/page';
import DeepInsightSlide18 from '@/app/slide/deep_insight/18/page';
import DeepInsightSlide19 from '@/app/slide/deep_insight/19/page';
import DeepInsightSlide20 from '@/app/slide/deep_insight/20/page';
import DeepInsightSlide21 from '@/app/slide/deep_insight/21/page';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

export default function DeepInsightPrint() {
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
        // Info: (20260131 - Luphia) Wait a bit for images to load (Next/Image lazy loading)
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
              // Info: (20260131 - Luphia) Filter out script tags or other non-visible elements that might cause issues
              if (node.tagName === 'SCRIPT' || node.tagName === 'LINK') return false;
              return true;
            }
          });
          const base64 = dataUrl.split(',')[1];
          zip.file(`DeepInsight_Slide_${(i + 1).toString().padStart(2, '0')}.png`, base64, { base64: true });
        }
        setProgress(Math.round(((i + 1) / slidePages.length) * 100));
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'DeepInsight_Slides_PNG.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. See console for details.');
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

      <div className="slide-page"><DeepInsightSlide1 /></div>
      <div className="slide-page"><DeepInsightSlide2 /></div>
      <div className="slide-page"><DeepInsightSlide3 /></div>
      <div className="slide-page"><DeepInsightSlide4 /></div>
      <div className="slide-page"><DeepInsightSlide5 /></div>
      <div className="slide-page"><DeepInsightSlide6 /></div>
      <div className="slide-page"><DeepInsightSlide7 /></div>
      <div className="slide-page"><DeepInsightSlide8 /></div>
      <div className="slide-page"><DeepInsightSlide9 /></div>
      <div className="slide-page"><DeepInsightSlide10 /></div>
      <div className="slide-page"><DeepInsightSlide11 /></div>
      <div className="slide-page"><DeepInsightSlide12 /></div>
      <div className="slide-page"><DeepInsightSlide13 /></div>
      <div className="slide-page"><DeepInsightSlide14 /></div>
      <div className="slide-page"><DeepInsightSlide15 /></div>
      <div className="slide-page"><DeepInsightSlide16 /></div>
      <div className="slide-page"><DeepInsightSlide17 /></div>
      <div className="slide-page"><DeepInsightSlide18 /></div>
      <div className="slide-page"><DeepInsightSlide19 /></div>
      <div className="slide-page"><DeepInsightSlide20 /></div>
      <div className="slide-page"><DeepInsightSlide21 /></div>
    </div>
  );
}
