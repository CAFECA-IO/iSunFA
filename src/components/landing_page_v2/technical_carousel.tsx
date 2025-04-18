import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa6';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';
import { LandingButton } from '@/components/landing_page_v2/landing_button';

const TechnicalCarousel: React.FC = () => {
  const { t } = useTranslation('common');

  const carouselRef = useRef<HTMLDivElement>(null);

  const carouselData = [
    {
      title: t('landing_page_v2:TECHNICAL_FEATURES.EFFICIENT_TITLE'),
      content: t('landing_page_v2:TECHNICAL_FEATURES.EFFICIENT_DESCRIPTION'),
    },
    {
      title: t('landing_page_v2:TECHNICAL_FEATURES.DECENTRALIZED_TITLE'),
      content: t('landing_page_v2:TECHNICAL_FEATURES.DECENTRALIZED_DESCRIPTION'),
    },
    {
      title: t('landing_page_v2:TECHNICAL_FEATURES.ZK_PROOF_TITLE'),
      content: t('landing_page_v2:TECHNICAL_FEATURES.ZK_PROOF_DESCRIPTION'),
    },
    {
      title: t('landing_page_v2:TECHNICAL_FEATURES.REAL_TIME_TITLE'),
      content: t('landing_page_v2:TECHNICAL_FEATURES.REAL_TIME_DESCRIPTION'),
    },
    {
      title: t('landing_page_v2:TECHNICAL_FEATURES.AUDIT_TITLE'),
      content: t('landing_page_v2:TECHNICAL_FEATURES.AUDIT_DESCRIPTION'),
    },
  ];

  const lastIdx = carouselData.length - 1;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isCarouselRefVisible, setIsCarouselRefVisible] = useState(false);

  // Info: (20241224 - Julian) 往後翻，如果是第一項則跳到最後一項
  const handleLeftClick = () => setCurrentIndex((prev) => (prev === 0 ? lastIdx : prev - 1));
  // Info: (20241224 - Julian) 往前翻，如果是最後一項則跳到第一項
  const handleRightClick = () => setCurrentIndex((prev) => (prev === lastIdx ? 0 : prev + 1));
  // Info: (20250108 - Julian) 滾動事件綁定動畫
  const scrollHandler = () => {
    if (carouselRef.current) {
      const rect = (carouselRef.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      setIsCarouselRefVisible(rectTop < windowHeight);
    }
  };

  // Info: (20250108 - Julian) 播放動畫
  useEffect(() => {
    window.addEventListener('scroll', scrollHandler, { passive: true });
    return () => {
      window.removeEventListener('scroll', scrollHandler);
    };
  }, []);

  useEffect(() => {
    if (isPaused) return undefined;

    // Info: (20241224 - Julian) 如果沒有暫停，則每 5 秒輪播
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === lastIdx ? 0 : prev + 1));
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <div
      ref={carouselRef}
      className="flex flex-col items-center justify-center gap-40px px-16px py-120px md:gap-80px md:px-80px lg:flex-row"
    >
      {/* Info: (20241224 - Julian) Image */}
      <div
        className={`${
          isCarouselRefVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
        } relative h-300px w-300px transition-all duration-500 md:h-536px md:w-536px`}
      >
        <Image src="/elements/golden_medal.png" alt="medal_icon" fill objectFit="contain" />
      </div>

      {/* Info: (20241224 - Julian) Text */}
      <div
        className={`${
          isCarouselRefVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }flex flex-col transition-all duration-500`}
      >
        <LinearGradientText size={LinearTextSize.MD} align={TextAlign.CENTER}>
          {t('landing_page_v2:TECHNICAL_FEATURES.TECHNICAL_PATENTS')}
        </LinearGradientText>
        {/* Info: (20241224 - Julian) Carousel */}
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="relative mt-20px w-320px flex-1 overflow-hidden md:mt-60px md:w-475px"
        >
          {/* Info: (20241224 - Julian) Track */}
          <div
            className="flex items-start transition-all duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {carouselData.map((data) => (
              <div key={data.title} className="flex w-320px shrink-0 flex-col gap-24px md:w-475px">
                {/* Info: (20241224 - Julian) Title */}
                <p className="text-xl text-landing-page-orange">{data.title}</p>
                {/* Info: (20241224 - Julian) Content */}
                <p className="text-xs font-normal md:text-base">{data.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Info: (20241224 - Julian) Slider */}
        <div className="mt-20px flex items-center justify-between">
          <div className="flex items-center gap-16px">
            {carouselData.map((data, index) => (
              <div
                key={data.title}
                onClick={() => setCurrentIndex(index)}
                className={`h-15px cursor-pointer rounded-full transition-all duration-300 ease-in-out hover:bg-landing-page-orange ${
                  currentIndex === index
                    ? 'w-40px bg-landing-page-orange'
                    : 'w-15px bg-landing-page-black2'
                }`}
              ></div>
            ))}
          </div>
          <div className="flex items-center">
            <LandingButton type="button" variant="default" onClick={handleLeftClick}>
              <FaArrowLeft />
            </LandingButton>
            <LandingButton type="button" variant="default" onClick={handleRightClick}>
              <FaArrowRight />
            </LandingButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicalCarousel;
