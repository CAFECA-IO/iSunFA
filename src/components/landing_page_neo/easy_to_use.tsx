import React, { useState } from 'react';
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
  onLeftClick: () => void;
  onRightClick: () => void;
}> = ({ title, description, imageSrc, imageAlt, order, onLeftClick, onRightClick }) => {
  // Info: (20241218 - Julian) 正中間的卡片樣式
  const activeStyle = 'opacity-100 scale-100 z-10 translate-x-0';
  // Info: (20241218 - Julian) 右後方的卡片樣式
  const rightStyle = 'opacity-90 scale-90 z-0 -translate-x-2/3 hover:cursor-pointer';
  // Info: (20241218 - Julian) 左後方的卡片樣式
  const leftStyle = 'opacity-90 scale-90 z-0 translate-x-2/3 hover:cursor-pointer';

  // Info: (20241218 - Julian) 根據 order 決定卡片位置（0: 右, 1: 中, 2: 左）
  const cardStyle = order === 0 ? rightStyle : order === 1 ? activeStyle : leftStyle;

  // Info: (20241218 - Julian) 根據 order 決定點擊事件
  const onClick = order === 0 ? onRightClick : order === 2 ? onLeftClick : undefined;

  return (
    <div
      onClick={onClick}
      className={`${cardStyle} absolute top-0 flex h-500px origin-bottom flex-col items-center gap-12px overflow-hidden rounded-lg border-x border-b bg-landing-page-white/30 p-40px text-center backdrop-blur-md transition-all duration-500 ease-in-out md:w-400px`}
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

  const [currentOrder, setCurrentOrder] = useState<number[]>([0, 1, 2]);

  const toLeft = () => {
    // Info: (20241218 - Julian) 左移:將最後一個元素移到第一個
    setCurrentOrder((prev) => {
      const newOrder = [...prev];
      newOrder.unshift(newOrder.pop()!);
      return newOrder;
    });
  };

  const toRight = () => {
    // Info: (20241218 - Julian) 右移:將第一個元素移到最後一個
    setCurrentOrder((prev) => {
      const newOrder = [...prev];
      newOrder.push(newOrder.shift()!);
      return newOrder;
    });
  };

  const displayedCards = cardInfo.map((card, index) => {
    return (
      <EasyIntroCard
        key={card.title}
        title={card.title}
        description={card.description}
        imageSrc={card.imageSrc}
        imageAlt={card.imageAlt}
        order={currentOrder[index]}
        onLeftClick={toLeft}
        onRightClick={toRight}
      />
    );
  });

  return (
    <div className="flex flex-col">
      {/* Info: (20241218 - Julian) Title */}
      <LinearGradientText size={LinearTextSize.LG} align={TextAlign.CENTER}>
        Easy to Use Without Accounting Expertise
      </LinearGradientText>

      {/* Info: (20241218 - Julian) Carousel */}
      <div className="relative mx-auto mt-80px h-550px w-full overflow-hidden bg-digital bg-cover bg-bottom bg-no-repeat lg:px-120px">
        <div className="relative flex transform-gpu items-center justify-center">
          {displayedCards}
        </div>
      </div>
    </div>
  );
};

export default EasyToUse;
