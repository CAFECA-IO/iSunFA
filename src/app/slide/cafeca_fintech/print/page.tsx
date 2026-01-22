
'use client';

import { useEffect } from 'react';
import CafecaFintechSlide1 from '@/app/slide/cafeca_fintech/1/page';
import CafecaFintechSlide2 from '@/app/slide/cafeca_fintech/2/page';
import CafecaFintechSlide3 from '@/app/slide/cafeca_fintech/3/page';
import CafecaFintechSlide4 from '@/app/slide/cafeca_fintech/4/page';
import CafecaFintechSlide5 from '@/app/slide/cafeca_fintech/5/page';
import CafecaFintechSlide6 from '@/app/slide/cafeca_fintech/6/page';
import CafecaFintechSlide7 from '@/app/slide/cafeca_fintech/7/page';

export default function CafecaFintechPrint() {
  useEffect(() => {
    // Info: (20260122 - Luphia) Auto-trigger print when loaded, for better UX
    setTimeout(() => {
      window.print();
    }, 1000);
  }, []);

  return (
    <div className="print-container bg-white">
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
        }
        @media print {
           .slide-page {
               margin-bottom: 0;
               border: none;
           }
        }
      `}} />

      <div className="slide-page"><CafecaFintechSlide1 /></div>
      <div className="slide-page"><CafecaFintechSlide2 /></div>
      <div className="slide-page"><CafecaFintechSlide3 /></div>
      <div className="slide-page"><CafecaFintechSlide4 /></div>
      <div className="slide-page"><CafecaFintechSlide5 /></div>
      <div className="slide-page"><CafecaFintechSlide6 /></div>
      <div className="slide-page"><CafecaFintechSlide7 /></div>
    </div>
  );
}
