import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';

const MessageBubble: React.FC<{ index: number }> = ({ index }) => {
  const { t } = useTranslation('common');

  return (
    <div className="flex items-center gap-14px overflow-hidden rounded-full border-x border-b bg-landing-nav px-40px py-12px shadow-landing-nav backdrop-blur-md">
      {/* Info: (20241224 - Julian) Avatar */}
      <div className="relative h-40px w-40px overflow-hidden rounded-full">
        <Image src="/entities/happy.png" fill objectFit="cover" alt="avatar" />
      </div>
      {/* Info: (20241224 - Julian) Message */}
      <p>{t(`landing_page_v2:HAPPY_CUSTOMER.MESSAGE_${index}`)}</p>
    </div>
  );
};

const HappyCustomer: React.FC = () => {
  const { t } = useTranslation('common');

  return (
    <div className="flex flex-col bg-magic-ball bg-contain bg-center bg-no-repeat py-120px">
      {/* Info: (20241205 - Julian) Title */}
      <div className="flex flex-col items-center">
        <p className="text-28px font-medium text-landing-page-white">iSunFA</p>
        <LinearGradientText size={LinearTextSize.LG} align={TextAlign.CENTER}>
          {t('landing_page_v2:HAPPY_CUSTOMER.MAIN_TITLE')}
        </LinearGradientText>
      </div>

      {/* Info: (20241205 - Julian) Message Bubbles */}
      <div className="relative mt-40px grid grid-cols-3 md:mt-80px">
        {Array.from({ length: 8 }).map((_, index) => (
          // ToDo: (20241224 - Julian) Developing
          // eslint-disable-next-line react/no-array-index-key
          <MessageBubble key={index} index={index + 1} />
        ))}
      </div>
    </div>
  );
};

export default HappyCustomer;
