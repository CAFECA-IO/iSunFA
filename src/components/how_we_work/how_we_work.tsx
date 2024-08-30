import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { TranslateFunction } from '@/interfaces/locale';

const HowWeWork = () => {
  const { t }: { t: TranslateFunction } = useTranslation('common');

  const animeRef21 = useRef(null);
  const [isAnimeRef21Visible, setIsAnimeRef21Visible] = useState(false);
  const animeRef22 = useRef(null);
  const [isAnimeRef22Visible, setIsAnimeRef22Visible] = useState(false);
  const animeRef23 = useRef(null);
  const [isAnimeRef23Visible, setIsAnimeRef23Visible] = useState(false);

  const scrollHandler = () => {
    if (animeRef21.current) {
      const rect = (animeRef21.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      setIsAnimeRef21Visible(rectTop < windowHeight);
    }

    if (animeRef22.current) {
      const rect = (animeRef22.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      setIsAnimeRef22Visible(rectTop < windowHeight);
    }

    if (animeRef23.current) {
      const rect = (animeRef23.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      setIsAnimeRef23Visible(rectTop < windowHeight);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', scrollHandler, { passive: true });
    return () => {
      window.removeEventListener('scroll', scrollHandler);
    };
  }, []);

  const verticalDotLine = (
    <div className="relative h-500px">
      {/* ----- Dot & Line components ----- */}
      <div className="flex items-center rounded-lg px-12 pt-10">
        {/* ----- filled circle ----- */}
        <div className={`absolute left-1.8rem z-10 h-27px w-27px rounded-full bg-primaryYellow`} />

        {/* ----- filled circle bg ----- */}
        <div className={`absolute left-1.4rem h-40px w-40px rounded-full bg-tertiaryBlue`}></div>

        {/* ----- Line ----- */}
        <div
          className={`absolute left-2.3rem top-5 h-800px w-1px border-5px border-solid border-tertiaryBlue md:h-400px`}
        />
      </div>
    </div>
  );

  const howWeWorkItems = [
    {
      ref: animeRef21,
      isVisible: isAnimeRef21Visible,
      imageUrl: '/elements/how_we_work_1.png',
      alt: 'how we work - privacy',
      title: 'common:LANDING_PAGE.PRIVACY_BLOCK_TITLE_1',
      content: 'common:LANDING_PAGE.PRIVACY_BLOCK_CONTENT_1',
    },
    {
      ref: animeRef22,
      isVisible: isAnimeRef22Visible,
      imageUrl: '/elements/how_we_work_2.png',
      alt: 'how we work - privacy',
      title: 'common:LANDING_PAGE.PRIVACY_BLOCK_TITLE_2',
      content: 'common:LANDING_PAGE.PRIVACY_BLOCK_CONTENT_2',
    },
    {
      ref: animeRef23,
      isVisible: isAnimeRef23Visible,
      imageUrl: '/elements/how_we_work_3.png',
      alt: 'how we work - privacy',
      title: 'common:LANDING_PAGE.PRIVACY_BLOCK_TITLE_3',
      content: 'common:LANDING_PAGE.PRIVACY_BLOCK_CONTENT_3',
    },
  ];

  const howWeWorkList = (
    <div>
      {howWeWorkItems.map(({ ref, isVisible, imageUrl, alt, title, content }) => (
        <div
          key={title}
          ref={ref}
          className={`-mb-16 overflow-x-hidden ${isVisible ? `translate-x-0` : `md:translate-x-140%`} -mt-14 flex h-900px w-full flex-col items-center justify-center pl-10 pt-10 duration-1000 md:mt-20 md:h-fit md:flex-row md:justify-start md:space-x-2 lg:mr-10 lg:mt-28 lg:pl-0`}
        >
          <div className={`relative mt-0 h-300px w-full md:w-full lg:mt-0 lg:w-500px`}>
            <Image src={imageUrl} alt={alt} fill style={{ objectFit: 'contain' }} loading="lazy" />
          </div>

          {/* Info: (20240321 - Shirley) ----- `lg` and above ----- */}
          <div className="mt-20 hidden flex-col space-y-5 text-start lg:mt-0 lg:flex lg:max-w-lg lg:space-y-8">
            {' '}
            <p className="text-h3 leading-h3 text-primaryYellow lg:text-h1 lg:leading-h1">
              {t(title)}
            </p>
            <p className="w-full text-white md:text-base">{t(content)}</p>
          </div>

          {/* Info: (20240321 - Shirley) ----- below `lg` ----- */}
          <div className="-mt-16 flex w-full flex-col space-y-5 text-wrap text-center md:-mt-0 md:text-start lg:hidden">
            {' '}
            <p className="text-h3 leading-h3 text-primaryYellow lg:text-h1 lg:leading-h1">
              {t(title)}
            </p>
            <p className="w-full text-sm text-white">{t(content)}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto flex h-fit w-full flex-col pb-20 pt-40 md:pt-56 lg:pb-20 lg:pt-0">
      <h1 className="z-10 flex w-full justify-center pt-28 text-h4 font-bold tracking-wider text-white md:text-h1">
        {t('common:LANDING_PAGE.HOW_WE_WORK_TITLE')}{' '}
      </h1>

      <div className="flex">
        <div className="absolute left-1/15 top-71rem md:left-1/10 md:top-78rem lg:relative lg:left-auto lg:top-auto lg:ml-1/20 lg:pt-40">
          {' '}
          <div className="flex flex-col justify-center">{verticalDotLine}</div>{' '}
          <div className="mt-18rem flex flex-col justify-center md:-mt-6.2rem">
            {verticalDotLine}
          </div>
          <div className="mt-18rem flex flex-col justify-center md:-mt-6.2rem">
            {verticalDotLine}
          </div>
        </div>

        <div className="ml-10 mt-0 flex flex-col space-y-32 md:ml-8 md:mt-32 lg:-ml-0 lg:mt-16">
          {howWeWorkList}
        </div>
      </div>
    </div>
  );
};

export default HowWeWork;
