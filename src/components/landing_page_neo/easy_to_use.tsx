import React from 'react';
import Image from 'next/image';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_neo/linear_gradient_text';

const EasyIntroCard: React.FC<{
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  order: number;
}> = ({ title, description, imageSrc, imageAlt, order }) => {
  const activeStyle = 'opacity-100 scale-100 z-10 translate-x-0';
  const rightStyle = 'opacity-90 scale-90 z-0 -translate-x-2/3';
  const leftStyle = 'opacity-90 scale-90 z-0 translate-x-2/3';

  const cardStyle = order === 0 ? rightStyle : order === 1 ? activeStyle : leftStyle;

  return (
    <div
      className={`${
        cardStyle
      } absolute top-0 flex h-500px origin-bottom flex-col items-center gap-12px overflow-hidden rounded-lg border-x border-b bg-landing-page-white/30 p-40px text-center backdrop-blur-md md:w-400px`}
    >
      {/* Info: (20241218 - Julian) Nail Icon */}
      <Image
        src="/icons/nail.svg"
        width={24}
        height={24}
        alt="nail_icon"
        className="absolute left-10px top-10px" // Info: (20241218 - Julian) 左上角
      />
      <Image
        src="/icons/nail.svg"
        width={24}
        height={24}
        alt="nail_icon"
        className="absolute bottom-10px left-10px" // Info: (20241218 - Julian) 左下角
      />
      <Image
        src="/icons/nail.svg"
        width={24}
        height={24}
        alt="nail_icon"
        className="absolute right-10px top-10px" // Info: (20241218 - Julian) 右上角
      />
      <Image
        src="/icons/nail.svg"
        width={24}
        height={24}
        alt="nail_icon"
        className="absolute bottom-10px right-10px" // Info: (20241218 - Julian) 右下角
      />
      {/* Info: (20241218 - Julian) Highlight */}
      <Image
        src="/elements/light.svg"
        width={360}
        height={13}
        alt="light"
        className="absolute -top-10px mx-auto"
      />

      {/* Info: (20241218 - Julian) Title */}
      <LinearGradientText size={LinearTextSize.SM} align={TextAlign.LEFT}>
        {title}
      </LinearGradientText>
      {/* Info: (20241218 - Julian) Description */}
      <p className="w-full flex-1 text-left text-lg font-normal">{description}</p>
      {/* Info: (20241218 - Julian) Image */}
      <div className="relative h-300px w-full">
        <Image src={imageSrc} alt={imageAlt} fill objectFit="contain" objectPosition="bottom" />
      </div>
    </div>
  );
};

const EasyToUse: React.FC = () => {
  const cardInfo = [
    {
      title: 'Automated input & real-time analysis',
      description: 'Generates financial statements every 24 hours',
      imageSrc: '/elements/glass_financial.svg',
      imageAlt: 'financial_icon',
    },
    {
      title: 'Simply take a photo to record transactions',
      description: 'Saves 85% of daily workflows',
      imageSrc: '/elements/glass_phone.svg',
      imageAlt: 'phone_icon',
    },
    {
      title: ' AI-assistant',
      description: 'Increases audit efficiency by 150 times',
      imageSrc: '/elements/glass_AI.svg',
      imageAlt: 'AI_icon',
    },
  ];

  const displayedCards = cardInfo.map((card, index) => (
    <EasyIntroCard
      key={card.title}
      title={card.title}
      description={card.description}
      imageSrc={card.imageSrc}
      imageAlt={card.imageAlt}
      order={index}
    />
  ));

  return (
    <div className="flex flex-col">
      {/* Info: (20241218 - Julian) Title */}
      <LinearGradientText size={LinearTextSize.LG} align={TextAlign.CENTER}>
        Easy to Use Without Accounting Expertise
      </LinearGradientText>

      {/* Info: (20241218 - Julian) Carousel */}
      <div className="perspective-distant relative mx-auto mt-80px h-550px w-full overflow-hidden bg-digital bg-cover bg-bottom bg-no-repeat lg:px-120px">
        <div className="relative flex transform-gpu items-center justify-center duration-500 ease-in-out">
          {displayedCards}
        </div>
      </div>
    </div>
  );
};

export default EasyToUse;
