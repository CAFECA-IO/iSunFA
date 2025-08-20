import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';

const GlobalMap: React.FC = () => {
  const { t } = useTranslation('common');

  const mapRef = useRef<HTMLDivElement>(null);
  const [isMapRefVisible, setIsMapRefVisible] = useState(false);

  const scrollHandler = () => {
    if (mapRef.current) {
      const rect = (mapRef.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      setIsMapRefVisible(rectTop < windowHeight);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', scrollHandler, { passive: true });
    return () => {
      window.removeEventListener('scroll', scrollHandler);
    };
  }, []);

  // Info: (20250115 - Julian) 手動換行
  const titleStr = t('landing_page_v2:GLOBAL_MAP.MAIN_TITLE')
    .split('\n')
    .map((line: string) => (
      <>
        {line}
        <br />
      </>
    ));

  return (
    <div ref={mapRef} className="flex flex-col px-16px py-120px md:px-80px lg:px-100px">
      <div className="flex flex-col gap-16px">
        <LinearGradientText
          size={LinearTextSize.LG}
          align={TextAlign.LEFT}
          className={`${
            isMapRefVisible ? 'translate-y-0 opacity-100' : '-translate-y-200px opacity-0'
          } transition-all duration-500`}
        >
          {titleStr}
        </LinearGradientText>
        <p
          className={`${
            isMapRefVisible ? 'translate-x-0 opacity-100' : '-translate-x-200px opacity-0'
          } text-xs font-medium transition-all duration-500 md:text-lg lg:text-xl`}
        >
          {t('landing_page_v2:GLOBAL_MAP.MAIN_DESCRIPTION')}
        </p>
      </div>

      <div
        className={`${
          isMapRefVisible ? 'translate-y-0 opacity-100' : 'translate-y-200px opacity-0'
        } relative flex h-300px w-full items-center transition-all duration-500 lg:h-700px`}
      >
        <Image src="/elements/map.svg" fill objectFit="contain" alt="map" />
        <p className="absolute right-1/5 -mt-10px text-xxs md:right-1/8 md:-mt-30px md:text-base">
          {t('landing_page_v2:GLOBAL_MAP.COMING_SOON')}
        </p>
      </div>
    </div>
  );
};

export default GlobalMap;
