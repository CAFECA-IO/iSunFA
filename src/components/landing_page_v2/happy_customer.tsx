import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';

const MessageBubble: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className, ...props }) => {
  return (
    <div
      className={`absolute ${className} flex items-center gap-14px overflow-hidden rounded-full border-x border-b bg-landing-nav px-20px py-4px text-xxs shadow-landing-nav backdrop-blur-md md:w-600px md:px-40px md:py-12px md:text-sm lg:text-base`}
      {...props}
    >
      {children}
    </div>
  );
};

const HappyCustomer: React.FC = () => {
  const { t } = useTranslation('common');

  return (
    <div className="flex flex-col bg-magic-ball bg-cover bg-center bg-no-repeat py-120px">
      {/* Info: (20241205 - Julian) Title */}
      <div className="flex flex-col items-center">
        <p className="text-28px font-medium text-landing-page-white">iSunFA</p>
        <LinearGradientText size={LinearTextSize.LG} align={TextAlign.CENTER}>
          {t('landing_page_v2:HAPPY_CUSTOMER.MAIN_TITLE')}
        </LinearGradientText>
      </div>

      {/* Info: (20241205 - Julian) Message Bubbles */}
      <div className="relative mx-auto mt-40px h-300px w-full md:mt-80px md:h-500px lg:w-90vw">
        <MessageBubble className="right-1/8 top-0 scale-75 blur-sm">
          {/* Info: (20241226 - Julian) Avatar */}
          <div className="relative h-15px w-15px shrink-0 overflow-hidden rounded-full md:h-40px md:w-40px">
            <Image src="/entities/happy.png" fill objectFit="cover" alt="avatar" />
          </div>
          {/* Info: (20241226 - Julian) Message */}
          <p>{t('landing_page_v2:HAPPY_CUSTOMER.MESSAGE_1')}</p>
        </MessageBubble>
        <MessageBubble className="left-1/8 top-1/10">
          {/* Info: (20241226 - Julian) Avatar */}
          <div className="relative h-15px w-15px shrink-0 overflow-hidden rounded-full md:h-40px md:w-40px">
            <Image src="/entities/happy.png" fill objectFit="cover" alt="avatar" />
          </div>
          {/* Info: (20241226 - Julian) Message */}
          <p>{t('landing_page_v2:HAPPY_CUSTOMER.MESSAGE_2')}</p>
        </MessageBubble>
        <MessageBubble className="left-1/3 top-2/10 z-20 scale-125">
          {/* Info: (20241226 - Julian) Avatar */}
          <div className="relative h-15px w-15px shrink-0 overflow-hidden rounded-full md:h-40px md:w-40px">
            <Image src="/entities/happy.png" fill objectFit="cover" alt="avatar" />
          </div>
          {/* Info: (20241226 - Julian) Message */}
          <p>{t('landing_page_v2:HAPPY_CUSTOMER.MESSAGE_6')}</p>
        </MessageBubble>
        <MessageBubble className="left-0 top-3/10 scale-75 blur-sm">
          {/* Info: (20241226 - Julian) Avatar */}
          <div className="relative h-15px w-15px shrink-0 overflow-hidden rounded-full md:h-40px md:w-40px">
            <Image src="/entities/happy.png" fill objectFit="cover" alt="avatar" />
          </div>
          {/* Info: (20241226 - Julian) Message */}
          <p>{t('landing_page_v2:HAPPY_CUSTOMER.MESSAGE_3')}</p>
        </MessageBubble>
        <MessageBubble className="left-1/6 top-4/10">
          {/* Info: (20241226 - Julian) Avatar */}
          <div className="relative h-15px w-15px shrink-0 overflow-hidden rounded-full md:h-40px md:w-40px">
            <Image src="/entities/happy.png" fill objectFit="cover" alt="avatar" />
          </div>
          {/* Info: (20241226 - Julian) Message */}
          <p>{t('landing_page_v2:HAPPY_CUSTOMER.MESSAGE_4')}</p>
        </MessageBubble>
        <MessageBubble className="right-0 top-1/3 z-10">
          {/* Info: (20241226 - Julian) Avatar */}
          <div className="relative h-15px w-15px shrink-0 overflow-hidden rounded-full md:h-40px md:w-40px">
            <Image src="/entities/happy.png" fill objectFit="cover" alt="avatar" />
          </div>
          {/* Info: (20241226 - Julian) Message */}
          <p>{t('landing_page_v2:HAPPY_CUSTOMER.MESSAGE_5')}</p>
        </MessageBubble>
        <MessageBubble className="right-1/12 top-1/2 z-10">
          {/* Info: (20241226 - Julian) Avatar */}
          <div className="relative h-15px w-15px shrink-0 overflow-hidden rounded-full md:h-40px md:w-40px">
            <Image src="/entities/happy.png" fill objectFit="cover" alt="avatar" />
          </div>
          {/* Info: (20241226 - Julian) Message */}
          <p>{t('landing_page_v2:HAPPY_CUSTOMER.MESSAGE_7')}</p>
        </MessageBubble>
        <MessageBubble className="left-1/5 top-5/8 z-20 scale-125">
          {/* Info: (20241226 - Julian) Avatar */}
          <div className="relative h-15px w-15px shrink-0 overflow-hidden rounded-full md:h-40px md:w-40px">
            <Image src="/entities/happy.png" fill objectFit="cover" alt="avatar" />
          </div>
          {/* Info: (20241226 - Julian) Message */}
          <p>{t('landing_page_v2:HAPPY_CUSTOMER.MESSAGE_9')}</p>
        </MessageBubble>
        <MessageBubble className="right-1/5 top-8/10 scale-75 blur-sm">
          {/* Info: (20241226 - Julian) Avatar */}
          <div className="relative h-15px w-15px shrink-0 overflow-hidden rounded-full md:h-40px md:w-40px">
            <Image src="/entities/happy.png" fill objectFit="cover" alt="avatar" />
          </div>
          {/* Info: (20241226 - Julian) Message */}
          <p>{t('landing_page_v2:HAPPY_CUSTOMER.MESSAGE_8')}</p>
        </MessageBubble>
      </div>
    </div>
  );
};

export default HappyCustomer;
