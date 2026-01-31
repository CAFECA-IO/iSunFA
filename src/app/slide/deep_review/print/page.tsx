
'use client';

import { useEffect } from 'react';
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

export default function DeepReviewPrint() {
  useEffect(() => {
    // Info: (20260121 - Luphia) Auto-trigger print when loaded
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
