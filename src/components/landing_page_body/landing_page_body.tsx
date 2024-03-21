import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import LandingFooter from '../landing_footer/landing_footer';
import { TranslateFunction } from '../../interfaces/locale';
import NumberAnimation from '../number_animation/number_animation';
import Carousel from '../carousel/carousel';
import Card from '../card/card';
import ContactForm from '../contact_form/contact_form';
import { Button } from '../button/button';
import { cn } from '../../lib/utils/common';

const IS_BUTTON_DISABLED_TEMP = true;

function LandingPageBody() {
  const { t }: { t: TranslateFunction } = useTranslation('common');
  const animeRef1 = useRef(null);
  const [isAnimeRef1Visible, setIsAnimeRef1Visible] = useState(false);

  const animeRef21 = useRef(null);
  const [isAnimeRef21Visible, setIsAnimeRef21Visible] = useState(false);
  const animeRef22 = useRef(null);
  const [isAnimeRef22Visible, setIsAnimeRef22Visible] = useState(false);
  const animeRef23 = useRef(null);
  const [isAnimeRef23Visible, setIsAnimeRef23Visible] = useState(false);

  const animeRef31 = useRef(null);
  const [isAnimeRef31Visible, setIsAnimeRef31Visible] = useState(false);
  const animeRef32 = useRef(null);
  const [isAnimeRef32Visible, setIsAnimeRef32Visible] = useState(false);
  const animeRef33 = useRef(null);
  const [isAnimeRef33Visible, setIsAnimeRef33Visible] = useState(false);

  const animeRef41 = useRef(null);
  const [isAnimeRef41Visible, setIsAnimeRef41Visible] = useState(false);
  const animeRef42 = useRef(null);
  const [isAnimeRef42Visible, setIsAnimeRef42Visible] = useState(false);

  const animeRef51 = useRef(null);
  const [isAnimeRef51Visible, setIsAnimeRef51Visible] = useState(false);
  const animeRef52 = useRef(null);
  const [isAnimeRef52Visible, setIsAnimeRef52Visible] = useState(false);
  const animeRef53 = useRef(null);
  const [isAnimeRef53Visible, setIsAnimeRef53Visible] = useState(false);
  const animeRef54 = useRef(null);
  const [isAnimeRef54Visible, setIsAnimeRef54Visible] = useState(false);
  const animeRef55 = useRef(null);
  const [isAnimeRef55Visible, setIsAnimeRef55Visible] = useState(false);

  const animeRef61 = useRef(null);
  const [isAnimeRef61Visible, setIsAnimeRef61Visible] = useState(false);

  useEffect(() => {
    const waitForCTA = setTimeout(() => {
      setIsAnimeRef1Visible(true);
    }, 500);
    return () => {
      clearTimeout(waitForCTA);
    };
  }, []);

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

    if (animeRef41.current) {
      const rect = (animeRef41.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      setIsAnimeRef41Visible(rectTop < windowHeight);
    }

    if (animeRef42.current) {
      const rect = (animeRef42.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      setIsAnimeRef42Visible(rectTop < windowHeight);
    }

    if (animeRef51.current) {
      const rect = (animeRef51.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      setIsAnimeRef51Visible(rectTop < windowHeight);
    }

    if (animeRef52.current) {
      const rect = (animeRef52.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      setIsAnimeRef52Visible(rectTop < windowHeight);
    }

    if (animeRef53.current) {
      const rect = (animeRef53.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      setIsAnimeRef53Visible(rectTop < windowHeight);
    }

    if (animeRef54.current) {
      const rect = (animeRef54.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      setIsAnimeRef54Visible(rectTop < windowHeight);
    }

    if (animeRef55.current) {
      const rect = (animeRef55.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      setIsAnimeRef55Visible(rectTop < windowHeight);
    }

    if (animeRef61.current) {
      const rect = (animeRef61.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      setIsAnimeRef61Visible(rectTop < windowHeight - 200);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', scrollHandler, { passive: true });
    return () => {
      window.removeEventListener('scroll', scrollHandler);
    };
  }, []);

  const numberBlockContent = [
    {
      image: '/elements/lightening_1.png',
      alt: 'lighting_1',
      description: 'LANDING_PAGE.NUMBER_BLOCK_DESCRIPTION_1',
      targetNumber: 150,
      unit: 'X',
    },
    {
      image: '/elements/clock.png',
      alt: 'clock',
      description: 'LANDING_PAGE.NUMBER_BLOCK_DESCRIPTION_2',
      targetNumber: 85,
      unit: '%',
    },
    {
      image: '/elements/robot_hand.png',
      alt: 'robot_hand',
      description: 'LANDING_PAGE.NUMBER_BLOCK_DESCRIPTION_3',
      targetNumber: 24,
      unit: 'hrs',
    },
  ];

  const numberBlockList = numberBlockContent.map(
    ({ image, alt, description, targetNumber, unit }, index) => (
      <div
        // Info: (20240112 - Shirley) it's ok to use index as key in this case
        // eslint-disable-next-line react/no-array-index-key
        key={index}
        className="relative z-10 mx-0 flex h-300px flex-col items-center space-y-14 rounded-2xl bg-tertiaryBlue px-10 py-10 drop-shadow-101"
      >
        {/* Info:(20230815 - Shirley) Image */}
        <div className="absolute -top-10 h-100px w-100px " style={{}}>
          <Image
            className="drop-shadow-xlReverse"
            src={image}
            alt={alt}
            fill
            style={{ objectFit: 'cover', objectPosition: 'center bottom' }}
          />
          <div className="relative left-0 top-7rem">
            <Image
              className=""
              src={`/elements/bottom_shadow.svg`}
              alt={alt}
              width={75}
              height={15}
              // style={{ objectFit: 'cover', objectPosition: 'center bottom' }}
            />
          </div>
        </div>
        {/* Info:(20240315 - Shirley) Number animation */}
        {/* <div className="h-80px" /> */}

        {/* Info:(20240315 - Shirley) Number animation */}
        <div className="flex w-full items-baseline justify-center space-x-2 font-bold">
          {' '}
          <NumberAnimation targetNumber={targetNumber} />
          <p className="text-h4 leading-h4">{unit}</p>
        </div>

        {/* Info:(20240315 - Shirley) Description */}
        <div className="pt-0">
          {' '}
          <p className="w-240px text-start text-base">{t(description)}</p>
        </div>
      </div>
    )
  );

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
      title: 'LANDING_PAGE.PRIVACY_BLOCK_TITLE_1',
      content: 'LANDING_PAGE.PRIVACY_BLOCK_CONTENT_1',
    },
    {
      ref: animeRef22,
      isVisible: isAnimeRef22Visible,
      imageUrl: '/elements/how_we_work_2.png',
      alt: 'how we work - privacy',
      title: 'LANDING_PAGE.PRIVACY_BLOCK_TITLE_2',
      content: 'LANDING_PAGE.PRIVACY_BLOCK_CONTENT_2',
    },
    {
      ref: animeRef23,
      isVisible: isAnimeRef23Visible,
      imageUrl: '/elements/how_we_work_3.png',
      alt: 'how we work - privacy',
      title: 'LANDING_PAGE.PRIVACY_BLOCK_TITLE_3',
      content: 'LANDING_PAGE.PRIVACY_BLOCK_CONTENT_3',
    },
  ];

  const howWeWorkList = (
    <section>
      {howWeWorkItems.map(({ ref, isVisible, imageUrl, alt, title, content }) => (
        <div
          ref={ref}
          className={`overflow-x-hidden ${isVisible ? `translate-x-0` : `translate-x-140%`} -mt-14 flex h-900px w-full flex-col items-center justify-center pl-10 pt-10 duration-1000 md:mt-20 md:h-fit md:flex-row md:justify-start md:space-x-2 lg:mr-10 lg:mt-28 lg:pl-0`}
        >
          <div className={`relative mt-0 h-300px w-full md:w-full lg:mt-0 lg:w-600px`}>
            <Image src={imageUrl} alt={alt} fill style={{ objectFit: 'contain' }} />
          </div>

          {/* Info: ----- 1440 px and above ----- (20240321 - Shirley) */}
          <div className="mt-20 hidden flex-col space-y-5 text-start lg:mt-0 lg:flex lg:max-w-lg lg:space-y-8">
            {' '}
            <p className="text-h3 leading-h3 text-primaryYellow lg:text-h1 lg:leading-h1">
              {t(title)}
            </p>
            <p className="text-white md:text-base">{t(content)}</p>
          </div>

          {/* Info: ----- below 1440 px ----- (20240321 - Shirley) */}
          <div className="-mt-16 flex w-full flex-col space-y-5 text-wrap text-center md:-mt-0 md:text-start lg:hidden">
            {' '}
            <p className="text-h3 leading-h3 text-primaryYellow lg:text-h1 lg:leading-h1">
              {t(title)}
            </p>
            <p className="w-full text-sm text-white">{t(content)}</p>
          </div>
        </div>
      ))}
    </section>
  );

  const carouselItems = [
    { title: 'LANDING_PAGE.CAROUSEL_TITLE_1', content: 'LANDING_PAGE.CAROUSEL_CONTENT_1' },
    { title: 'LANDING_PAGE.CAROUSEL_TITLE_2', content: 'LANDING_PAGE.CAROUSEL_CONTENT_2' },
    { title: 'LANDING_PAGE.CAROUSEL_TITLE_3', content: 'LANDING_PAGE.CAROUSEL_CONTENT_3' },
    { title: 'LANDING_PAGE.CAROUSEL_TITLE_4', content: 'LANDING_PAGE.CAROUSEL_CONTENT_4' },
    { title: 'LANDING_PAGE.CAROUSEL_TITLE_5', content: 'LANDING_PAGE.CAROUSEL_CONTENT_5' },
  ];

  return (
    <div className="">
      <div className="flex min-h-screen w-screen flex-col bg-secondaryBlue font-barlow">
        <div className="relative flex flex-col items-center lg:h-1000px">
          {/* Info: web background image (20240318 - Shirley) */}
          <div className="absolute right-0 top-22rem flex aspect-1/1 w-120vw flex-col items-center bg-web bg-cover bg-center bg-no-repeat md:aspect-4/3 lg:top-0 lg:w-1400px lg:bg-cover lg:bg-top-4">
            {' '}
            <div className="absolute -bottom-2 left-0 flex aspect-21/9 w-full bg-customGradient bg-cover bg-no-repeat"></div>
            {/* Info: WI: shadow_01 svg */}
            <div className="absolute -bottom-0 left-0 flex aspect-21/9 w-full bg-customGradient bg-cover bg-no-repeat"></div>
          </div>
          {/* <div className="bg-background_pattern absolute right-0 top-0 flex h-screen w-screen flex-col items-center bg-cover bg-center bg-no-repeat mix-blend-screen lg:bg-cover lg:bg-top-4"></div> */}
          {/* Info: ---light_up svg--- (20240318 - Shirley) */}
          <div className="absolute h-screen w-screen mix-blend-screen">
            <div className="absolute right-0 top-0 h-1800px w-700px bg-light_up bg-no-repeat bg-blend-color-dodge lg:w-900px"></div>
          </div>
          {/* Info: ---light_up svg--- (20240318 - Shirley) */}
          {/* Info: ---light_down svg--- (20240318 - Shirley) */}
          <div className="absolute h-screen w-screen mix-blend-screen">
            {' '}
            <div className="bottomShadow absolute -left-1/10 top-1/2 z-0 h-1800px w-120vw bg-light_down bg-contain bg-no-repeat bg-blend-color-dodge shadow-md lg:-top-1/3 lg:w-1400px"></div>
          </div>
          {/* Info: ---light_down svg--- (20240318 - Shirley) */}
          {/* Info: ---green_light_left svg--- (20240318 - Shirley) */}
          <div className="absolute h-screen w-screen mix-blend-color-dodge">
            {' '}
            <div className="absolute -right-0 top-1/3 h-1200px w-1400px bg-green_light_left bg-contain bg-no-repeat bg-blend-color-dodge"></div>
          </div>
          {/* Info: ---green_light_left svg--- (20240318 - Shirley) */}

          {/* Info: ---green_light_right svg--- (20240318 - Shirley) */}
          <div className="absolute h-screen w-screen mix-blend-color-dodge">
            <div className="absolute right-0 top-20 h-1200px w-1400px bg-green_light_right bg-contain bg-no-repeat bg-blend-color-dodge"></div>
          </div>
          {/* Info: ---green_light_right svg--- (20240318 - Shirley) */}
          {/* Info:(20230711 - Shirley) Main Title Block */}

          <div className="flex w-full justify-center lg:w-9/10">
            {/* Info: iSunFA Call to action (20240319 - SHirley) */}
            <div
              ref={animeRef1}
              className={`overflow-x-hidden ${isAnimeRef1Visible ? `translate-x-0` : `-translate-x-140%`} z-5 flex w-full flex-col items-start justify-start space-y-10 px-0 pb-12 pt-2/5 text-start transition-all duration-1000 md:-ml-40 md:w-3/5 md:pt-1/5 lg:-ml-0 lg:h-screen lg:pt-1/6`}
            >
              <div className="ml-10">
                <div className="flex flex-col md:space-y-5">
                  {' '}
                  <h1 className="text-h4 font-bold tracking-wider text-primaryYellow md:text-6xl lg:text-7xl">
                    {t('LANDING_PAGE.MAIN_TITLE')}
                  </h1>
                  <h1 className="text-h6 font-bold tracking-widest text-hoverWhite md:text-2xl lg:text-6xl">
                    {t('LANDING_PAGE.MAIN_SUBTITLE_1')}
                  </h1>
                </div>
                <ol className="mt-8 max-w-md list-disc space-y-2 text-base tracking-widest text-hoverWhite md:max-w-xl lg:mt-10 lg:max-w-2xl lg:text-base">
                  <li>{t('LANDING_PAGE.MAIN_SUBTITLE_2_POINT_1')}</li>
                  <li>{t('LANDING_PAGE.MAIN_SUBTITLE_2_POINT_2')}</li>
                  <li>{t('LANDING_PAGE.MAIN_SUBTITLE_2_POINT_3')}</li>
                  <li>{t('LANDING_PAGE.MAIN_SUBTITLE_2_POINT_4')}</li>
                  <li>{t('LANDING_PAGE.MAIN_SUBTITLE_2_POINT_5')}</li>
                </ol>
              </div>

              <div className="z-5 flex w-full justify-center px-5 md:w-auto">
                <Button className="w-full space-x-3 md:w-auto" disabled={IS_BUTTON_DISABLED_TEMP}>
                  <p
                    className={cn(
                      'text-base leading-6 tracking-normal',
                      IS_BUTTON_DISABLED_TEMP ? 'text-lightGray2' : 'text-secondaryBlue',
                      'group-hover:text-white'
                    )}
                  >
                    {t('NAV_BAR.TRY_NOW')}
                  </p>

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M8.86388 3.52973C9.12423 3.26939 9.54634 3.26939 9.80669 3.52973L13.8067 7.52974C14.067 7.79008 14.067 8.21219 13.8067 8.47254L9.80669 12.4725C9.54634 12.7329 9.12423 12.7329 8.86388 12.4725C8.60353 12.2122 8.60353 11.7901 8.86388 11.5297L11.7258 8.66781H2.66862C2.30043 8.66781 2.00195 8.36933 2.00195 8.00114C2.00195 7.63295 2.30043 7.33447 2.66862 7.33447H11.7258L8.86388 4.47254C8.60353 4.21219 8.60353 3.79008 8.86388 3.52973Z"
                      className={cn(
                        `fill-current`,
                        IS_BUTTON_DISABLED_TEMP ? `text-lightGray2` : `text-secondaryBlue`,
                        `group-hover:text-white`
                      )}
                    />
                  </svg>
                </Button>
              </div>
            </div>
            {/* Info: iSunFA 大字 (20240318 - Shirley) */}
            <div className={`mt-1/10 hidden h-screen items-start lg:flex`}>
              {/* TODO: 用 <Image> 優化 (20240320 - Shirley) */}
              {/* eslint-disable @next/next/no-img-element */}
              <img
                alt="isunfa_pop"
                loading="lazy"
                src="/elements/isunfa_pop.svg"
                className={`aspect-0.87 w-9/10 grow mix-blend-soft-light max-md:mt-10 max-md:max-w-full ${isAnimeRef1Visible ? 'animate-slideBottomToTop' : 'hidden'}`}
              />
            </div>
          </div>
        </div>

        {/* Info: ----- light_01 svg ----- (20240318 - Shirley) */}
        <div className="relative">
          {' '}
          <div className="absolute h-screen w-screen mix-blend-color-dodge">
            <div className="absolute right-0 top-0 aspect-0.87 w-1400px bg-light_01 bg-no-repeat bg-blend-color-dodge"></div>
          </div>
        </div>
        {/* Info: ----- light_01 svg ----- (20240318 - Shirley) */}

        {/* Info:(20230815 - Shirley) How we work */}
        <div className="container mx-auto flex h-fit w-full flex-col pb-20 pt-40 md:pt-56 lg:pb-20 lg:pt-0">
          <h1 className="z-10 flex w-full justify-center pt-28 text-h4 font-bold tracking-wider text-white md:text-h1">
            {t('LANDING_PAGE.HOW_WE_WORK_TITLE')}{' '}
          </h1>

          <div className="flex">
            <div className="absolute left-1/15 top-71rem md:left-1/10 md:top-78rem lg:relative lg:left-auto lg:top-auto lg:ml-1/8 lg:pt-40">
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

        {/* Info: (20240315 - Shirley) Blocks with number animation */}
        <div className="mt-48 flex flex-col items-center space-y-28 scroll-smooth px-4 md:mt-52 lg:w-full lg:flex-row lg:justify-evenly lg:space-x-14 lg:space-y-0 lg:overflow-x-auto lg:px-40 lg:py-20">
          {numberBlockList}
        </div>

        {/* Info: ----- light_02 svg ----- (20240318 - Shirley) */}
        <div className="relative">
          {' '}
          <div className="absolute h-screen w-screen mix-blend-color-dodge">
            <div className="absolute -top-20 left-0 h-1400px w-full bg-light_02 bg-no-repeat bg-blend-color-dodge md:w-1200px"></div>
          </div>
        </div>
        {/* Info: ----- light_02 svg ----- (20240318 - Shirley) */}

        {/* Info:(20240315 - Shirley) Features Block */}
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
                  className={`overflow-x-hidden ${isAnimeRef31Visible ? `translate-x-0` : `-translate-x-140%`} relative aspect-4/3 w-80vw duration-1000 md:h-515px md:w-650px lg:w-865px`}
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
                  className={`overflow-x-hidden ${isAnimeRef32Visible ? `translate-x-0` : `translate-x-140%`} relative bottom-2/5 left-1/2 aspect-4/3 w-40vw duration-1000 md:bottom-21rem md:left-20rem md:w-330px lg:bottom-19rem lg:left-32rem lg:w-432px`}
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
        <div>
          {/* Info: ----- light_03 svg ----- (20240318 - Shirley) */}
          <div className="relative">
            {' '}
            <div className="absolute h-screen w-screen mix-blend-color-dodge">
              <div className="absolute -top-0 right-0 aspect-0.87 w-1400px bg-light_03 bg-no-repeat bg-blend-color-dodge"></div>
            </div>
          </div>
          {/* Info: ----- light_03 svg ----- (20240318 - Shirley) */}
          {/* Info: ----- Partners (20240318 - Shirley) ----- */}
          <div className="flex w-full flex-col flex-wrap content-center justify-center pt-10 max-md:max-w-full max-md:px-5 md:p-20">
            <div
              ref={animeRef41}
              // Info: 從左邊移到中間的動畫 (20240319 - Shirley)
              className={`overflow-x-hidden ${isAnimeRef41Visible ? `translate-x-0` : `-translate-x-140%`} mt-10 items-center justify-center px-16 py-2.5 text-center text-h6 font-semibold tracking-tighter text-white duration-1000 max-md:max-w-full max-md:px-5 md:text-3xl`}
            >
              {t('LANDING_PAGE.PARTNER_SECTION_TITLE')}
            </div>
            <div
              ref={animeRef42}
              className={`mb-4 mt-20 flex w-388px max-w-full flex-col items-center justify-center gap-5 space-y-10 self-center max-md:mt-10 md:flex-row md:flex-wrap md:justify-between md:space-y-0`}
            >
              <Image
                width={154}
                height={40}
                alt="partner logo"
                loading="lazy"
                src="/elements/partner_1.svg"
                className={`${isAnimeRef42Visible ? `translate-x-0` : `-translate-x-100%`} duration-1000`}
              />
              <Image
                width={154}
                height={40}
                alt="partner logo"
                loading="lazy"
                src="/elements/partner_2.svg"
                className={`${isAnimeRef42Visible ? `translate-x-0` : `-translate-x-100%`} duration-1000`}
              />
            </div>
          </div>
          {/* Info: ----- Partners (20240318 - Shirley) ----- */}

          {/* Info: ----- Carousel (20240318 - Shirley) ----- */}
          <div className="flex w-full flex-col items-center justify-center space-x-5 md:mt-20 lg:flex-row">
            <div className="relative mt-20 aspect-0.87 w-4/5 md:h-400px md:w-400px">
              <Image
                src="/elements/contract_blue.svg"
                alt="contract_blue"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>{' '}
            <div className="max-w-350px md:max-w-700px">
              {' '}
              <Carousel autoSlide>
                {carouselItems.map(({ title, content }) => (
                  <Card key={title} title={t(title)} content={t(content)} />
                ))}
              </Carousel>
            </div>
          </div>
          {/* Info: ----- Carousel (20240318 - Shirley) ----- */}
        </div>

        {/* Info: ----- why iSunFA (20240318 - Shirley) ----- */}
        <div className="flex w-full flex-col justify-center px-16 max-md:max-w-full max-md:px-5 md:py-20">
          <div className="mx-5 mb-20 mt-32 max-md:my-10 max-md:mr-2.5 max-md:max-w-full">
            <div className="flex gap-5 max-lg:flex-col max-md:gap-0">
              <div className="mt-24 flex flex-col max-lg:ml-0 lg:w-1/2">
                <div className="flex grow flex-col justify-center max-md:mt-10 max-md:max-w-full lg:w-full">
                  <div
                    ref={animeRef51}
                    className={`overflow-x-hidden ${isAnimeRef51Visible ? `translate-x-0` : `-translate-x-140%`} flex w-full justify-center pt-2 text-h6 font-semibold leading-h6 tracking-tighter text-white duration-1000 max-md:max-w-full md:justify-start md:text-5xl md:leading-h1`}
                  >
                    {t('LANDING_PAGE.WHY_ISUNFA_SECTION_TITLE')}
                  </div>

                  <div className="mt-10 flex flex-col space-y-5 max-md:max-w-full">
                    <div
                      ref={animeRef51}
                      className={`overflow-x-hidden ${isAnimeRef51Visible ? `translate-x-0` : `-translate-x-140%`} flex gap-4 duration-1000 max-md:flex-wrap`}
                    >
                      <div className="my-auto flex items-center justify-center">
                        <div className="hidden md:flex">
                          <Image
                            loading="lazy"
                            src="/elements/yellow_check.svg"
                            width={32}
                            height={32}
                            alt="yellow check icon"
                          />
                        </div>

                        <div className="z-10 flex md:hidden">
                          <Image
                            loading="lazy"
                            src="/elements/yellow_check.svg"
                            width={20}
                            height={20}
                            alt="yellow check icon"
                          />
                        </div>

                        <div className="w-fit grow justify-center pl-5 text-xs tracking-normal text-white max-md:max-w-full md:text-base md:font-medium md:leading-6">
                          {t('LANDING_PAGE.WHY_ISUNFA_CONTENT_1')}
                        </div>
                      </div>
                    </div>

                    <div
                      ref={animeRef52}
                      className={`overflow-x-hidden ${isAnimeRef52Visible ? `translate-x-0` : `-translate-x-140%`} flex gap-4 duration-1000 max-md:flex-wrap`}
                    >
                      <div className="my-auto flex items-center justify-center">
                        <div className="hidden md:flex">
                          <Image
                            loading="lazy"
                            src="/elements/yellow_check.svg"
                            width={32}
                            height={32}
                            alt="yellow check icon"
                          />
                        </div>

                        <div className="z-10 flex md:hidden">
                          <Image
                            loading="lazy"
                            src="/elements/yellow_check.svg"
                            width={20}
                            height={20}
                            alt="yellow check icon"
                          />
                        </div>

                        <div className="w-fit grow justify-center pl-5 text-xs tracking-normal text-white max-md:max-w-full md:text-base md:font-medium md:leading-6">
                          {t('LANDING_PAGE.WHY_ISUNFA_CONTENT_2')}
                        </div>
                      </div>
                    </div>

                    <div
                      ref={animeRef53}
                      className={`overflow-x-hidden ${isAnimeRef53Visible ? `translate-x-0` : `-translate-x-140%`} flex gap-4 duration-1000 max-md:flex-wrap`}
                    >
                      <div className="my-auto flex items-center justify-center">
                        <div className="hidden md:flex">
                          <Image
                            loading="lazy"
                            src="/elements/yellow_check.svg"
                            width={32}
                            height={32}
                            alt="yellow check icon"
                          />
                        </div>

                        <div className="z-10 flex md:hidden">
                          <Image
                            loading="lazy"
                            src="/elements/yellow_check.svg"
                            width={20}
                            height={20}
                            alt="yellow check icon"
                          />
                        </div>

                        <div className="w-fit grow justify-center pl-5 text-xs tracking-normal text-white max-md:max-w-full md:text-base md:font-medium md:leading-6">
                          {t('LANDING_PAGE.WHY_ISUNFA_CONTENT_3')}
                        </div>
                      </div>
                    </div>

                    <div
                      ref={animeRef54}
                      className={`overflow-x-hidden ${isAnimeRef54Visible ? `translate-x-0` : `-translate-x-140%`} flex gap-4 duration-1000 max-md:flex-wrap`}
                    >
                      <div className="my-auto flex items-center justify-center">
                        <div className="hidden md:flex">
                          <Image
                            loading="lazy"
                            src="/elements/yellow_check.svg"
                            width={32}
                            height={32}
                            alt="yellow check icon"
                          />
                        </div>

                        <div className="z-10 flex md:hidden">
                          <Image
                            loading="lazy"
                            src="/elements/yellow_check.svg"
                            width={20}
                            height={20}
                            alt="yellow check icon"
                          />
                        </div>

                        <div className="w-fit grow justify-center pl-5 text-xs tracking-normal text-white max-md:max-w-full md:text-base md:font-medium md:leading-6">
                          {t('LANDING_PAGE.WHY_ISUNFA_CONTENT_4')}
                        </div>
                      </div>
                    </div>

                    <div
                      ref={animeRef55}
                      className={`overflow-x-hidden ${isAnimeRef55Visible ? `translate-x-0` : `-translate-x-140%`} flex gap-4 duration-1000 max-md:flex-wrap`}
                    >
                      <div className="my-auto flex items-center justify-center">
                        <div className="hidden md:flex">
                          <Image
                            loading="lazy"
                            src="/elements/yellow_check.svg"
                            width={32}
                            height={32}
                            alt="yellow check icon"
                          />
                        </div>

                        <div className="z-10 flex md:hidden">
                          <Image
                            loading="lazy"
                            src="/elements/yellow_check.svg"
                            width={20}
                            height={20}
                            alt="yellow check icon"
                          />
                        </div>

                        <div className="w-fit grow justify-center pl-5 text-xs tracking-normal text-white max-md:max-w-full md:text-base md:font-medium md:leading-6">
                          {t('LANDING_PAGE.WHY_ISUNFA_CONTENT_5')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info: mac img for 1440 px and above (20240321- Shirlrey) */}
              <div className={`hidden flex-col max-lg:ml-0 lg:flex`}>
                <Image
                  alt="partial mac"
                  width={800}
                  height={472}
                  loading="lazy"
                  src="/elements/partial_mac.png"
                  className={`absolute right-0 grow self-stretch overflow-x-hidden duration-1000 max-md:mt-10 max-md:max-w-full`}
                />
              </div>

              {/* Info: mac img for width below 1440 px (20240321- Shirlrey) */}
              <div className="flex h-350px md:h-750px lg:hidden">
                <Image
                  alt="partial mac"
                  width={800}
                  height={800}
                  loading="lazy"
                  src="/elements/partial_mac_md.png"
                  className={`absolute right-0 grow self-stretch overflow-x-hidden duration-1000 max-md:mt-10 max-md:max-w-full`}
                />
              </div>
            </div>
          </div>
        </div>
        {/* Info: ----- why iSunFA (20240318 - Shirley) ----- */}

        {/* Info: ----- light_04 svg ----- (20240318 - Shirley) */}
        <div className="relative">
          {' '}
          <div className="absolute h-screen w-screen mix-blend-color-dodge">
            <div className="absolute -left-20 -top-96rem h-1200px w-1400px bg-light_04 bg-no-repeat bg-blend-color-dodge lg:-top-24rem lg:left-0"></div>
          </div>
        </div>
        {/* Info: ----- light_04 svg ----- (20240318 - Shirley) */}
        {/* Info: ----- Contact form ----- (20240318 - Shirley) */}
        <div id="contact-us" className="mb-20 h-1000px md:-mt-20 lg:-mt-4">
          <div className="relative h-500px w-full">
            {' '}
            <Image
              src="/animations/contact_bg.svg"
              alt="contact_bg"
              fill
              style={{ objectFit: 'cover' }}
            />
            <div
              ref={animeRef61}
              className={` ${isAnimeRef61Visible ? `translate-x-0` : `-translate-x-140%`} absolute inset-0 flex justify-center duration-1000`}
            >
              {' '}
              <ContactForm />
            </div>
          </div>
        </div>
        {/* Info: ----- Contact form ----- (20240318 - Shirley) */}

        {/* Info:(20230711 - Shirley) Footer */}
        <div className="">
          <LandingFooter />
        </div>
      </div>
    </div>
  );
}

export default LandingPageBody;
