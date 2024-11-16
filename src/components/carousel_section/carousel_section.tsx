import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import React from 'react';
import Carousel from '@/components/carousel/carousel';
import Card from '@/components/card/card';
import { TranslateFunction } from '@/interfaces/locale';

const CarouselSection = () => {
  const { t }: { t: TranslateFunction } = useTranslation('landing_page');
  const carouselItems = [
    {
      title: 'landing_page:LANDING_PAGE.CAROUSEL_TITLE_1',
      content: 'landing_page:LANDING_PAGE.CAROUSEL_CONTENT_1',
    },
    {
      title: 'landing_page:LANDING_PAGE.CAROUSEL_TITLE_2',
      content: 'landing_page:LANDING_PAGE.CAROUSEL_CONTENT_2',
    },
    {
      title: 'landing_page:LANDING_PAGE.CAROUSEL_TITLE_3',
      content: 'landing_page:LANDING_PAGE.CAROUSEL_CONTENT_3',
    },
    {
      title: 'landing_page:LANDING_PAGE.CAROUSEL_TITLE_4',
      content: 'landing_page:LANDING_PAGE.CAROUSEL_CONTENT_4',
    },
    {
      title: 'landing_page:LANDING_PAGE.CAROUSEL_TITLE_5',
      content: 'landing_page:LANDING_PAGE.CAROUSEL_CONTENT_5',
    },
  ];

  return (
    <div className="z-10 flex w-full flex-col items-center justify-center space-x-5 md:mt-20 lg:flex-row">
      <div className="relative mt-20 h-200px w-200px md:h-300px md:w-300px xl:h-400px xl:w-400px">
        <Image
          src="/elements/contract_blue.svg"
          alt="contract_blue"
          fill
          style={{ objectFit: 'contain' }}
        />
      </div>{' '}
      <div className="max-w-350px md:max-w-600px xl:max-w-650px">
        {' '}
        <Carousel autoSlide>
          {carouselItems.map(({ title, content }) => (
            <Card key={title} title={t(title)} content={t(content)} />
          ))}
        </Carousel>
      </div>
    </div>
  );
};

export default CarouselSection;
