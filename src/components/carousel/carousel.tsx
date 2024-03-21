/* eslint-disable */
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { TranslateFunction } from '../../interfaces/locale';
import { useTranslation } from 'next-i18next';

interface CarouselProps {
  children: JSX.Element[];
  autoSlide?: boolean;
  autoSlideInterval?: number;
}

export default function Carousel({
  children: children,
  autoSlide = false,
  autoSlideInterval = 3000,
}: CarouselProps) {
  const { t }: { t: TranslateFunction } = useTranslation('common');
  const [curr, setCurr] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const carouselRef = useRef(null);

  const prev = () => setCurr(curr => (curr === 0 ? children.length - 1 : curr - 1));
  const next = () => setCurr(curr => (curr === children.length - 1 ? 0 : curr + 1));

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        console.log('Carousel is in view:', entry.isIntersecting);
        setIsInView(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.1,
      }
    );

    if (carouselRef.current) {
      observer.observe(carouselRef.current);
    }

    return () => {
      if (carouselRef.current) {
        observer.unobserve(carouselRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!autoSlide || isPaused || !isInView) return;
    const slideInterval = setInterval(next, autoSlideInterval);
    return () => clearInterval(slideInterval);
  }, [isPaused, isInView]);

  return (
    <div className="mt-10 flex flex-col" ref={carouselRef}>
      <p className="ml-16 text-h6 leading-h6 md:ml-24 md:text-h2 md:leading-h2">
        {t('LANDING_PAGE.CAROUSEL_SECTION_TITLE')}
      </p>
      <div
        className="relative overflow-hidden hover:cursor-pointer"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className={`flex flex-row transition-transform duration-500 ease-out`}
          style={{ transform: `translateX(-${curr * 100}%)` }}
        >
          {children.map((child, i) => (
            <div key={i} className="w-full">
              {child}
            </div>
          ))}
        </div>
        {/* Info: 往前往後的按鈕 (20240315 - Shirley)*/}
        <div className="absolute inset-0 z-10 flex items-center justify-between p-0">
          <button
            onClick={prev}
            className="rounded-full px-3 py-1 text-white shadow hover:cursor-pointer"
          >
            <Image src="/elements/arrow_left.svg" alt="arrow_left" width={24} height={24} />
          </button>
          <button
            onClick={next}
            className="rounded-full px-3 py-1 text-white shadow hover:cursor-pointer"
          >
            <Image src="/elements/arrow_right.svg" alt="arrow_left" width={24} height={24} />
          </button>
        </div>

        {/* Info: 點點點 (20240315 - Shirley)*/}
        <div className="absolute bottom-4 left-1/2 -translate-x-2/3 transform lg:-translate-x-4/5">
          <div className="flex items-center justify-center gap-2">
            {children.map((_, i) => (
              <div
                key={i}
                className={`
              h-1 w-3 rounded-full  transition-all
              ${curr === i ? 'bg-primaryYellow' : 'bg-tertiaryBlue'}
            `}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
