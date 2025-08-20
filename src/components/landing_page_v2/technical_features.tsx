import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';
import { useTranslation } from 'next-i18next';

interface ITechnicalCardProps {
  title1: string;
  title2: string;
  content: string;
  imageSrc: string;
  imageAlt: string;
  isShowAnimation: boolean;
}

const TechnicalCard: React.FC<ITechnicalCardProps> = ({
  title1,
  title2,
  content,
  imageSrc,
  imageAlt,
  isShowAnimation,
}) => {
  // Info: (20250108 - Julian) 第一張卡片(first)由右邊滑入，第二張卡片(even)由下方滑入，第三張卡片(last)由左邊滑入
  const cardAnim = isShowAnimation
    ? 'first:translate-x-0 even:translate-y-0 last:translate-x-0 opacity-100'
    : 'first:translate-x-full even:translate-y-full last:-translate-x-full opacity-0';

  // Info: (20250115 - Julian) 手動換行
  const title1Str = title1.split('\n').map((line: string) => (
    <>
      {line}
      <br />
    </>
  ));

  const title2Str = title2.split('\n').map((line: string) => (
    <>
      {line}
      <br />
    </>
  ));

  return (
    <div
      className={`${cardAnim} relative mx-auto flex w-full flex-col items-center gap-12px rounded-lg border bg-cloudy-glass px-45px py-50px backdrop-blur-md transition-all duration-500 md:w-450px lg:shadow-technical-card lg:last:col-span-2`}
    >
      {/* Info: (20241223 - Julian) Brilliant square */}
      <div className="absolute -top-50px h-85px w-130px rounded-sm border-b border-t border-landing-page-white bg-landing-btn shadow-landing-btn-hover"></div>
      {/* Info: (20241223 - Julian) Spotlight */}
      <div className="absolute top-70px h-50px w-5/10 bg-landing-page-orange/50 blur-2xl"></div>
      {/* Info: (20241223 - Julian) Nails */}
      <Image
        src="/icons/round_nail.svg"
        width={40}
        height={40}
        alt="nail_icon"
        className="absolute left-10px top-10px" // Info: (20241223 - Julian) 左上角
      />
      <Image
        src="/icons/round_nail.svg"
        width={40}
        height={40}
        alt="nail_icon"
        className="absolute bottom-10px left-10px" // Info: (20241223 - Julian) 左下角
      />
      <Image
        src="/icons/round_nail.svg"
        width={40}
        height={40}
        alt="nail_icon"
        className="absolute right-10px top-10px" // Info: (20241223 - Julian) 右上角
      />
      <Image
        src="/icons/round_nail.svg"
        width={40}
        height={40}
        alt="nail_icon"
        className="absolute bottom-10px right-10px" // Info: (20241223 - Julian) 右下角
      />
      {/* Info: (20241218 - Julian) Highlight */}
      <div className="absolute left-0 top-0 h-full w-full overflow-hidden">
        <Image
          src="/elements/light.svg"
          width={360}
          height={13}
          alt="light"
          className="absolute -bottom-10px left-0 right-0 mx-auto"
        />
      </div>

      {/* Info: (20241223 - Julian) Card Content */}
      <div className="z-10 flex flex-1 flex-col items-center gap-12px">
        <p className="text-center text-xl font-medium leading-8">{title1Str}</p>
        <Image src={imageSrc} alt={imageAlt} width={64} height={64} />
        <LinearGradientText size={LinearTextSize.SM} align={TextAlign.LEFT}>
          {title2Str}
        </LinearGradientText>
        <p className="w-full text-left">{content}</p>
      </div>
    </div>
  );
};

const TechnicalFeatures: React.FC = () => {
  const { t } = useTranslation('common');
  const technicalRef = useRef<HTMLDivElement>(null);
  const [isTechnicalRefVisible, setIsTechnicalRefVisible] = useState(false);

  const scrollHandler = () => {
    if (technicalRef.current) {
      const rect = (technicalRef.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      setIsTechnicalRefVisible(rectTop < windowHeight);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', scrollHandler, { passive: true });
    return () => {
      window.removeEventListener('scroll', scrollHandler);
    };
  }, []);

  const technicalData = [
    {
      title1: t('landing_page_v2:TECHNICAL_FEATURES.FINANCIAL_1'),
      title2: t('landing_page_v2:TECHNICAL_FEATURES.FINANCIAL_2'),
      content: t('landing_page_v2:TECHNICAL_FEATURES.FINANCIAL_3'),
      imageSrc: '/elements/dollar.png',
      imageAlt: 'dollar_icon',
    },
    {
      title1: t('landing_page_v2:TECHNICAL_FEATURES.ZERO_KNOWLEDGE_1'),
      title2: t('landing_page_v2:TECHNICAL_FEATURES.ZERO_KNOWLEDGE_2'),
      content: t('landing_page_v2:TECHNICAL_FEATURES.ZERO_KNOWLEDGE_3'),
      imageSrc: '/elements/lock.png',
      imageAlt: 'lock_icon',
    },
    {
      title1: t('landing_page_v2:TECHNICAL_FEATURES.TW_GAAP_1'),
      title2: t('landing_page_v2:TECHNICAL_FEATURES.TW_GAAP_2'),
      content: t('landing_page_v2:TECHNICAL_FEATURES.TW_GAAP_3'),
      imageSrc: '/elements/cyborg.png',
      imageAlt: 'cyborg_icon',
    },
  ];

  return (
    <div className="flex flex-col items-center px-16px py-120px md:px-80px lg:px-112px">
      {/* Info: (20241205 - Julian) Title */}
      <LinearGradientText
        size={LinearTextSize.LG}
        align={TextAlign.CENTER}
        className={`${
          isTechnicalRefVisible ? 'translate-y-0 opacity-100' : '-translate-y-200px opacity-0'
        } transition-all duration-500`}
      >
        {t('landing_page_v2:TECHNICAL_FEATURES.MAIN_TITLE')}
      </LinearGradientText>

      {/* Info: (20241205 - Julian) Content */}
      <div ref={technicalRef} className="relative mt-120px lg:mt-75px">
        {/* Info: (20241223 - Julian) Background */}
        <div className="absolute z-0 hidden h-full w-full items-center justify-center lg:flex">
          <div className="h-3/5 w-3/5 border"></div>
        </div>
        {/* Info: (20241223 - Julian) Cards */}
        <div className="z-10 grid w-full grid-cols-1 gap-x-120px gap-y-120px lg:mt-75px lg:grid-cols-2 lg:justify-between">
          {technicalData.map((data) => (
            <TechnicalCard
              key={data.imageAlt}
              title1={data.title1}
              title2={data.title2}
              content={data.content}
              imageSrc={data.imageSrc}
              imageAlt={data.imageAlt}
              isShowAnimation={isTechnicalRefVisible}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TechnicalFeatures;
