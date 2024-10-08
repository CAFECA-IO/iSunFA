import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import { TranslateFunction } from '@/interfaces/locale';

interface CarouselProps {
  children: JSX.Element[];
  autoSlide?: boolean;
  autoSlideInterval?: number;
}

export default function Carousel({
  children,
  autoSlide = false,
  autoSlideInterval = 3000,
}: CarouselProps) {
  const { t }: { t: TranslateFunction } = useTranslation('common');
  const [curr, setCurr] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const carouselRef = useRef(null);

  const prev = () => setCurr((preCurr) => (preCurr === 0 ? children.length - 1 : preCurr - 1));
  const next = () => setCurr((preCurr) => (preCurr === children.length - 1 ? 0 : preCurr + 1));
  let keyIndex = 0;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
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
    if (!autoSlide || isPaused || !isInView) return undefined;
    const slideInterval = setInterval(next, autoSlideInterval);
    return () => clearInterval(slideInterval);
  }, [isPaused, isInView]);

  return (
    <div className="mt-10 flex flex-col" ref={carouselRef}>
      <p className="ml-16 text-h6 leading-h6 md:ml-7rem md:text-h2 md:leading-h2 xl:ml-24">
        {t('common:LANDING_PAGE.CAROUSEL_SECTION_TITLE')}
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
          {children.map((child) => {
            keyIndex += 1;
            return (
              <div key={keyIndex} className="w-full">
                {child}
              </div>
            );
          })}
        </div>
        {/* Info: (20240315 - Shirley) 往前往後的按鈕 */}
        <div className="absolute inset-0 z-10 flex items-center justify-between p-0">
          <button
            onClick={prev}
            type="button"
            className="rounded-full px-3 py-1 text-icon-surface-solid-white shadow hover:cursor-pointer"
          >
            <Image src="/elements/arrow_left.svg" alt="arrow_left" width={24} height={24} />
          </button>
          <button
            onClick={next}
            type="button"
            className="rounded-full px-3 py-1 text-icon-surface-solid-white shadow hover:cursor-pointer"
          >
            <Image src="/elements/arrow_right.svg" alt="arrow_left" width={24} height={24} />
          </button>
        </div>

        {/* Info: (20240315 - Shirley) 點點點 */}
        <div className="absolute bottom-4 left-1/2 -translate-x-2/3 lg:left-1/3 lg:-translate-x-0">
          <div className="flex items-center justify-center gap-2">
            {children.map((_, i) => {
              keyIndex += 1;
              return (
                <div
                  key={keyIndex}
                  className={`h-1 w-3 rounded-full transition-all ${curr === i ? 'bg-carousel-surface-active' : 'bg-navy-blue-400'} `}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
