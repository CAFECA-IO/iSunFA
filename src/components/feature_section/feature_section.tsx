import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { TranslateFunction } from '../../interfaces/locale';

const FeatureSection = () => {
  const { t }: { t: TranslateFunction } = useTranslation('common');

  const animeRef31 = useRef(null);
  const [isAnimeRef31Visible, setIsAnimeRef31Visible] = useState(false);
  const animeRef32 = useRef(null);
  const [isAnimeRef32Visible, setIsAnimeRef32Visible] = useState(false);
  const animeRef33 = useRef(null);
  const [isAnimeRef33Visible, setIsAnimeRef33Visible] = useState(false);

  const scrollHandler = () => {
    if (animeRef31.current) {
      const rect = (animeRef31.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      setIsAnimeRef31Visible(rectTop < windowHeight);
    }

    if (animeRef32.current) {
      const rect = (animeRef32.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      setIsAnimeRef32Visible(rectTop < windowHeight);
    }

    if (animeRef33.current) {
      const rect = (animeRef33.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      setIsAnimeRef33Visible(rectTop < windowHeight);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', scrollHandler, { passive: true });
    return () => {
      window.removeEventListener('scroll', scrollHandler);
    };
  }, []);

  const heroDescriptions = [
    {
      image: '/elements/bulb.svg',
      alt: 'bulb icon',
      title: 'LANDING_PAGE.HERO_TITLE_1',
      description: 'LANDING_PAGE.HERO_CONTENT_1',
    },
    {
      image: '/elements/server.svg',
      alt: 'server icon',
      title: 'LANDING_PAGE.HERO_TITLE_2',
      description: 'LANDING_PAGE.HERO_CONTENT_2',
    },
    {
      image: '/elements/shield.svg',
      alt: 'shield icon',
      title: 'LANDING_PAGE.HERO_TITLE_3',
      description: 'LANDING_PAGE.HERO_CONTENT_3',
    },
  ];

  const heroList = heroDescriptions.map(({ image, alt, description, title }) => (
    <div key={image} className="flex flex-col items-center space-y-6 text-center">
      <div className="relative h-48px w-48px md:h-80px md:w-80px">
        <Image src={image} alt={alt} fill style={{ objectFit: 'contain' }} />
      </div>

      <p className="text-h6 leading-h6 text-primaryYellow md:text-h5 md:leading-h5">{t(title)}</p>

      <p className="w-3/5 text-xs leading-normal text-white md:w-full md:text-base">
        {t(description)}
      </p>
    </div>
  ));

  return (
    <div className="container mx-auto flex h-fit w-full flex-col pt-10 md:pt-20 lg:pb-20 lg:pt-20">
      <div className="flex flex-col items-center space-y-3 px-4 pt-20 text-center md:space-y-10 md:pt-20 lg:mb-40 lg:h-450px lg:space-y-16 lg:px-20 lg:py-20">
        <div className="flex flex-col">
          <h3 className="text-h5 font-bold leading-h5 text-white md:text-h1 md:leading-h1">
            {t('LANDING_PAGE.FEATURES_SUBTITLE')}
          </h3>
        </div>
        <div className="flex justify-center pr-1/10">
          <div className="relative">
            <div
              ref={animeRef31}
              // Info: 從左邊移到中間 (20240319 - Shirley)
              className={`overflow-x-hidden ${isAnimeRef31Visible ? `translate-x-0` : `md:-translate-x-140%`} relative aspect-4/3 w-80vw duration-1000 md:h-515px md:w-650px lg:w-865px`}
            >
              <Image
                src="/elements/mac.png"
                alt="feature intro - mac"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>

            <div
              ref={animeRef32}
              // Info: 從右邊移到中間 (20240319 - Shirley)
              className={`overflow-x-hidden ${isAnimeRef32Visible ? `translate-x-0` : `md:translate-x-140%`} relative bottom-2/5 left-1/2 aspect-4/3 w-40vw duration-1000 md:bottom-21rem md:left-20rem md:w-330px lg:bottom-19rem lg:left-32rem lg:w-432px`}
            >
              <Image
                src="/elements/ipad.png"
                alt="feature intro - ipad"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        ref={animeRef33}
        // Info: 從下面移到中間 (20240319 - Shirley)
        className={`overflow-x-hidden ${isAnimeRef33Visible ? `lg:translate-y-0` : `lg:translate-y-140%`} -mt-10 grid w-full grid-cols-1 justify-center gap-20 duration-1000 md:-mt-40 md:mb-40 lg:mx-0 lg:mt-40 lg:flex-1 lg:grid-cols-3 lg:gap-10`}
      >
        {heroList}
      </div>
    </div>
  );
};

export default FeatureSection;
