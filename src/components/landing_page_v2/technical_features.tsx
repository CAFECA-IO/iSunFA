import React from 'react';
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
}

const TechnicalCard: React.FC<ITechnicalCardProps> = ({
  title1,
  title2,
  content,
  imageSrc,
  imageAlt,
}) => {
  return (
    <div className="relative flex flex-col items-center gap-12px rounded-lg border bg-cloudy-glass px-45px py-50px backdrop-blur-md">
      {/* Info: (20241223 - Julian) Decoration */}
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
      {/* Info: (20241223 - Julian) Brilliant square */}
      <div className="absolute -top-50px h-85px w-130px rounded-sm border-b border-t border-landing-page-white bg-landing-btn shadow-landing-btn-hover"></div>

      {/* Info: (20241223 - Julian) Card Content */}
      <p className="text-xl font-medium leading-8">{title1}</p>
      <Image src={imageSrc} alt={imageAlt} width={64} height={64} />
      <LinearGradientText size={LinearTextSize.SM} align={TextAlign.CENTER}>
        {title2}
      </LinearGradientText>
      <p className="w-full text-left">{content}</p>
    </div>
  );
};

const TechnicalFeatures: React.FC = () => {
  const { t } = useTranslation('common');

  const technicalData = [
    {
      title1: t('landing_page_v2:TECHNICAL_FEATURES.FINANCIAL_1'),
      title2: t('landing_page_v2:TECHNICAL_FEATURES.FINANCIAL_2'),
      content: t('landing_page_v2:TECHNICAL_FEATURES.FINANCIAL_3'),
      imageSrc: '/icons/dollar.svg',
      imageAlt: 'dollar_icon',
    },
    {
      title1: t('landing_page_v2:TECHNICAL_FEATURES.ZERO_KNOWLEDGE_1'),
      title2: t('landing_page_v2:TECHNICAL_FEATURES.ZERO_KNOWLEDGE_2'),
      content: t('landing_page_v2:TECHNICAL_FEATURES.ZERO_KNOWLEDGE_3'),
      imageSrc: '/icons/lock.svg',
      imageAlt: 'lock_icon',
    },
    {
      title1: t('landing_page_v2:TECHNICAL_FEATURES.TW_GAAP_1'),
      title2: t('landing_page_v2:TECHNICAL_FEATURES.TW_GAAP_2'),
      content: t('landing_page_v2:TECHNICAL_FEATURES.TW_GAAP_3'),
      imageSrc: '/icons/cyborg.svg',
      imageAlt: 'cyborg_icon',
    },
  ];

  return (
    <div className="flex flex-col py-120px lg:px-112px">
      {/* Info: (20241205 - Julian) Title */}
      <LinearGradientText size={LinearTextSize.LG} align={TextAlign.CENTER}>
        Technical Features
      </LinearGradientText>

      {/* Info: (20241205 - Julian) Content */}
      <div className="mt-75px grid grid-cols-3 gap-24px">
        {technicalData.map((data) => (
          <TechnicalCard
            key={data.imageAlt}
            title1={data.title1}
            title2={data.title2}
            content={data.content}
            imageSrc={data.imageSrc}
            imageAlt={data.imageAlt}
          />
        ))}
      </div>
    </div>
  );
};

export default TechnicalFeatures;
