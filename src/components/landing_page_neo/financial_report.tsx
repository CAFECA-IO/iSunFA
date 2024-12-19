import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_neo/linear_gradient_text';

const FinancialReport: React.FC = () => {
  const { t } = useTranslation('common');

  return (
    <div className="flex flex-col items-start justify-between bg-landing-page-black3 px-16px py-120px md:px-80px lg:flex-row lg:items-center lg:px-112px">
      <div className="order-2 flex flex-col gap-16px lg:order-1 lg:w-1/2">
        {/* Info: (20241218 - Julian) Title */}
        <LinearGradientText size={LinearTextSize.LG} align={TextAlign.LEFT}>
          {t('landing_page_v2:REAL_TIME_REPORT.MAIN_TITLE')}
        </LinearGradientText>

        {/* Info: (20241218 - Julian) Reports */}
        <ul className="list-none text-xs md:text-lg lg:text-xl">
          <li>{t('landing_page_v2:REAL_TIME_REPORT.BS')}</li>
          <li>{t('landing_page_v2:REAL_TIME_REPORT.CFS')}</li>
          <li>{t('landing_page_v2:REAL_TIME_REPORT.CIS')}</li>
          <li>{t('landing_page_v2:REAL_TIME_REPORT.401')}</li>
        </ul>
      </div>

      {/* Info: (20241218 - Julian) Image */}
      <div className="order-1 mx-auto max-w-400px lg:order-2 lg:w-1/2">
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
