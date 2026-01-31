
'use client';

import { useEffect } from 'react';
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

export default function DeepInsightPrint() {
  useEffect(() => {
    // Info: (20260121 - Luphia) Auto-trigger print when loaded, for better UX
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
