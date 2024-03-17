/* eslint-disable */
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

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
  const [curr, setCurr] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInView, setIsInView] = useState(false); // New state to track if the carousel is in view
  const carouselRef = useRef(null); // Reference to the carousel element

  const prev = () => setCurr(curr => (curr === 0 ? children.length - 1 : curr - 1));
  const next = () => setCurr(curr => (curr === children.length - 1 ? 0 : curr + 1));

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        console.log('Carousel is in view:', entry.isIntersecting); // Debugging
        setIsInView(entry.isIntersecting);
      },
      {
        root: null, // Observes intersections relative to the viewport
        rootMargin: '0px',
        threshold: 0.1, // Adjusted to 0 for debugging
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
    console.log('isInView', isInView);
    if (!autoSlide || isPaused || !isInView) return;
    const slideInterval = setInterval(next, autoSlideInterval);
    return () => clearInterval(slideInterval);
  }, [isPaused, isInView]); // Add isInView to the dependency array

  return (
    <div className="flex flex-col mt-10" ref={carouselRef}>
      <p className="text-h2 leading-h2 ml-24">Technical Patents</p>
      <div
        className="overflow-hidden relative hover:cursor-pointer"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className={`flex flex-row transition-transform ease-out duration-500`}
          style={{ transform: `translateX(-${curr * 100}%)` }}
        >
          {/* <div> */}
          {/* iterate children */}
          {children.map((child, i) => (
            <div key={i} className="w-full">
              {child}
            </div>
          ))}
          {/* </div> */}
        </div>
        {/* Info: 往前往後的按鈕 */}
        {/* 將按鈕放置在卡片容器外部，並調整位置 */}

        <div className="absolute inset-0 flex items-center justify-between p-0">
          <button
            onClick={prev}
            className="px-3 py-1 rounded-full shadow text-white hover:cursor-pointer"
          >
            <Image src="/elements/arrow_left.svg" alt="arrow_left" width={24} height={24} />
          </button>
          <button
            onClick={next}
            className="px-3 py-1 rounded-full shadow text-white hover:cursor-pointer"
          >
            <Image src="/elements/arrow_right.svg" alt="arrow_left" width={24} height={24} />
          </button>
        </div>

        {/* Info: 點點點 */}
        <div className="absolute bottom-4 right-0 left-0">
          <div className="flex items-center justify-center gap-2">
            {children.map((_, i) => (
              <div
                key={i}
                className={`
              transition-all w-3 h-1  rounded-full
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
