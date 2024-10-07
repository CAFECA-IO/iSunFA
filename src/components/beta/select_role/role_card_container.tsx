import React, { useState } from 'react';
import Image from 'next/image';

interface CardProps {
  title: string;
  imageSrc: string;
  altText: string;
}

const Card: React.FC<CardProps> = ({ title, imageSrc, altText }) => (
  <div className="relative flex h-120px w-360px skew-x-20 items-center rounded-sm border-4 border-orange-400 bg-yellow-200 text-text-neutral-primary transition-all duration-300 ease-in-out hover:border-yellow-400 hover:bg-yellow-300">
    <p className="-skew-x-20 pl-140px text-32px font-bold">{title}</p>
    <Image
      src={imageSrc}
      alt={altText}
      width={48}
      height={48}
      className="absolute -left-50px -top-30px w-160px -skew-x-20 rounded-full"
    />
  </div>
);

const RoleCardContainer: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const cards = [
    { id: 1, title: 'Bookkeeper', imageSrc: '/images/bookkeeper.png', altText: 'bookkeeper' },
    {
      id: 2,
      title: 'Educational Trial Version',
      imageSrc: '/images/educational_trial.png',
      altText: 'educational_trial',
    },
    { id: 3, title: 'Accountant', imageSrc: '/images/accountant.png', altText: 'accountant' },
    {
      id: 4,
      title: 'Financial Analyst',
      imageSrc: '/images/financial_analyst.png',
      altText: 'financial_analyst',
    },
    // 可以在這裡新增更多卡片
  ];

  const itemsPerPage = 3; // 一次顯示的卡片數量
  const maxIndex = Math.ceil(cards.length / itemsPerPage) - 1;

  const handleNext = () => {
    if (currentIndex < maxIndex) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const start = currentIndex * itemsPerPage;
  const visibleCards = cards.slice(start, start + itemsPerPage);

  return (
    <div className="relative mx-auto mb-40px flex flex-col items-center">
      <div className="flex gap-80px">
        {visibleCards.map((card) => (
          <Card key={card.id} title={card.title} imageSrc={card.imageSrc} altText={card.altText} />
        ))}
      </div>

      <div className="mt-20px flex w-full justify-between">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="rounded bg-blue-500 px-4 py-2 text-white disabled:opacity-50"
        >
          上一頁
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={currentIndex === maxIndex}
          className="rounded bg-blue-500 px-4 py-2 text-white disabled:opacity-50"
        >
          下一頁
        </button>
      </div>
    </div>
  );
};

export default RoleCardContainer;
