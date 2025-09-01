import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';

const FinancialReport: React.FC = () => {
  const { t } = useTranslation('common');

  const reportRef = useRef<HTMLDivElement>(null);
  const [isReportRefVisible, setIsReportRefVisible] = useState(false);

  const scrollHandler = () => {
    if (reportRef.current) {
      const rect = (reportRef.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      setIsReportRefVisible(rectTop < windowHeight);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', scrollHandler, { passive: true });
    return () => {
      window.removeEventListener('scroll', scrollHandler);
    };
  }, []);

  // Info: (20250115 - Julian) 手動換行
  const titleStr = t('landing_page_v2:REAL_TIME_REPORT.MAIN_TITLE')
    .split('\n')
    .map((line: string) => (
      <>
        {line}
        <br />
      </>
    ));

  return (
    <div
      ref={reportRef}
      className="flex flex-col items-start justify-between bg-landing-page-mute px-16px py-120px md:px-80px lg:flex-row lg:items-center lg:px-112px"
    >
      <div className="order-2 flex flex-col gap-16px lg:order-1 lg:w-1/2">
        {/* Info: (20241218 - Julian) Title */}
        <LinearGradientText
          size={LinearTextSize.LG}
          align={TextAlign.LEFT}
          className={`${
            isReportRefVisible ? 'translate-y-0 opacity-100' : '-translate-y-200px opacity-0'
          } transition-all duration-500`}
        >
          {titleStr}
        </LinearGradientText>

        {/* Info: (20241218 - Julian) Reports */}
        <div
          className={`${
            isReportRefVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
          } flex flex-col gap-20px text-xs transition-all duration-500 md:text-lg lg:text-xl`}
        >
          <p>{t('landing_page_v2:REAL_TIME_REPORT.DESCRIPTION_1')}</p>
          <p>{t('landing_page_v2:REAL_TIME_REPORT.DESCRIPTION_2')}</p>
        </div>
      </div>

      {/* Info: (20241218 - Julian) Image */}
      <div
        className={`${
          isReportRefVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        } order-1 mx-auto max-w-400px transition-all duration-500 lg:order-2 lg:w-1/2`}
      >
        <Image
          src="/elements/real_time_report.png"
          width={544}
          height={476}
          alt="real_time_report_icon"
        />
      </div>
    </div>
  );
};

export default FinancialReport;
