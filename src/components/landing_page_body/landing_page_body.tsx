/* eslint-disable */
import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';
import { useTranslation } from 'next-i18next';
import LandingFooter from '../landing_footer/landing_footer';
import { massiveDataContent, whyUsContent } from '../../constants/config';
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

  // const scrollHandler = () => {
  //   if (animeRef1.current) {
  //     const rect = (animeRef1.current as HTMLElement).getBoundingClientRect();
  //     const rectTop = rect.top;
  //     const windowHeight = window.innerHeight;
  //     const rectVisible = 200;

  //     console.log('rectTop', rectTop, 'windowHeight', windowHeight);
  //     setIsAnimeRef1Visible(rectTop < windowHeight);
  //   }
  // };

  // useEffect(() => {
  //   window.addEventListener('scroll', scrollHandler, { passive: true });
  //   return () => {
  //     window.removeEventListener('scroll', scrollHandler);
  //   };
  // }, []);

  useEffect(() => {
    const waitForCTA = setTimeout(() => {
      setIsAnimeRef1Visible(true);
    }, 500);
    return () => {
      clearTimeout(waitForCTA);
    };
  }, []);

  const scrollHandler21 = () => {
    if (animeRef21.current) {
      const rect = (animeRef21.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      console.log('rectTop', rectTop, 'windowHeight', windowHeight);
      // setIsAnimeRef1Visible(rectTop < windowHeight);
      setIsAnimeRef21Visible(rectTop < windowHeight);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', scrollHandler21, { passive: true });
    return () => {
      window.removeEventListener('scroll', scrollHandler21);
    };
  }, []);
  const scrollHandler22 = () => {
    if (animeRef22.current) {
      const rect = (animeRef22.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      console.log('rectTop', rectTop, 'windowHeight', windowHeight);
      // setIsAnimeRef1Visible(rectTop < windowHeight);
      setIsAnimeRef22Visible(rectTop < windowHeight);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', scrollHandler22, { passive: true });
    return () => {
      window.removeEventListener('scroll', scrollHandler22);
    };
  }, []);

  const scrollHandler23 = () => {
    if (animeRef23.current) {
      const rect = (animeRef23.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      console.log('rectTop', rectTop, 'windowHeight', windowHeight);
      // setIsAnimeRef1Visible(rectTop < windowHeight);
      setIsAnimeRef23Visible(rectTop < windowHeight);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', scrollHandler23, { passive: true });
    return () => {
      window.removeEventListener('scroll', scrollHandler23);
    };
  }, []);

  // useEffect(() => {
  //   const observer = new IntersectionObserver(([entry]) => {
  //     console.log('entry', entry.isIntersecting);
  //     if (entry.isIntersecting) {
  //       setIsAnimeRef1Visible(true);
  //     } else {
  //       setIsAnimeRef1Visible(false);
  //     }
  //   });

  //   if (animeRef1.current) {
  //     observer.observe(animeRef1.current);
  //   }

  //   return () => {
  //     if (animeRef1.current) {
  //       observer.unobserve(animeRef1.current);
  //     }
  //   };
  // }, []);

  const massiveDataList = massiveDataContent.map(({ icon, text, alt }, index) => (
    // Info: (20240112 - Shirley) it's ok to use index as key in this case
    // eslint-disable-next-line react/no-array-index-key
    <div key={index} className="flex flex-col items-center space-y-4 px-4">
      <div className="relative h-50px w-50px">
        <Image src={icon} alt={alt} fill style={{ objectFit: 'contain' }} />
      </div>
      <p className="text-base font-normal lg:text-lg">{t(text)}</p>
    </div>
  ));

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

  const heroList = heroDescriptions.map(({ image, alt, description, title }, index) => (
    <div key={image} className="flex flex-col items-center space-y-6 text-center">
      <div className="relative h-80px w-80px">
        <Image src={image} alt={alt} fill style={{ objectFit: 'contain' }} />
      </div>

      <p className="text-h5 leading-h5 text-primaryYellow">{t(title)}</p>

      <p className="text-base text-white">{t(description)}</p>
    </div>
  ));

  const verticalDotLine = (
    <>
      <div className="relative h-500px">
        {/* ----- Dot & Line components ----- */}
        <div className="flex items-center rounded-lg px-12 pt-10 ">
          {/* ----- filled circle ----- */}
          <div
            className={`absolute left-1.8rem z-10 h-27px w-27px rounded-full bg-primaryYellow`}
          ></div>

          {/* ----- filled circle bg ----- */}
          <div className={`absolute left-1.4rem h-40px w-40px rounded-full bg-tertiaryBlue`}></div>

          {/* ----- Line ----- */}
          <div
            className={`absolute left-2.3rem top-5 h-400px w-1px border-5px border-solid border-tertiaryBlue`}
          />
        </div>
      </div>
    </>
  );

  const carouselItems = [
    { title: 'LANDING_PAGE.CAROUSEL_TITLE_1', content: 'LANDING_PAGE.CAROUSEL_CONTENT_1' },
    { title: 'LANDING_PAGE.CAROUSEL_TITLE_2', content: 'LANDING_PAGE.CAROUSEL_CONTENT_2' },
    { title: 'LANDING_PAGE.CAROUSEL_TITLE_3', content: 'LANDING_PAGE.CAROUSEL_CONTENT_3' },
    { title: 'LANDING_PAGE.CAROUSEL_TITLE_4', content: 'LANDING_PAGE.CAROUSEL_CONTENT_4' },
    { title: 'LANDING_PAGE.CAROUSEL_TITLE_5', content: 'LANDING_PAGE.CAROUSEL_CONTENT_5' },
  ];

  return (
    <div>
      <div className="flex min-h-screen w-screen flex-col overflow-hidden bg-secondaryBlue font-barlow">
        <div className="relative flex flex-col items-center">
          {/* Info: web background image (20240318 - Shirley) */}
          <div className="absolute right-0 top-0 flex aspect-4/3 w-1400px flex-col items-center bg-web bg-cover bg-center bg-no-repeat lg:bg-cover lg:bg-top-4">
            {' '}
            <div className="absolute -bottom-2 left-0 flex aspect-21/9 w-full bg-customGradient bg-cover bg-no-repeat"></div>
            {/* Info: WI: shadow_01 svg */}
            <div className="absolute -bottom-0 left-0 flex aspect-21/9 w-full bg-customGradient bg-cover bg-no-repeat"></div>
          </div>
          {/* <div className="bg-background_pattern absolute right-0 top-0 flex h-screen w-screen flex-col items-center bg-cover bg-center bg-no-repeat mix-blend-screen lg:bg-cover lg:bg-top-4"></div> */}
          {/* Info: ---light_up svg--- (20240318 - Shirley) */}
          <div className="absolute h-screen w-screen mix-blend-screen">
            <div className="absolute right-0 top-0 h-1800px w-900px bg-light_up bg-no-repeat bg-blend-color-dodge"></div>
          </div>
          {/* Info: ---light_up svg--- (20240318 - Shirley) */}
          {/* Info: ---light_down svg--- (20240318 - Shirley) */}
          <div className="absolute h-screen w-screen mix-blend-screen">
            {' '}
            <div className="bottomShadow absolute -left-1/10 -top-1/3 z-0 h-1800px w-1400px bg-light_down bg-contain bg-no-repeat bg-blend-color-dodge shadow-md"></div>
          </div>
          {/* Info: ---light_down svg--- (20240318 - Shirley) */}
          {/* Info: ---shadow_01 svg--- (20240318 - Shirley) */}
          {/* Info: WI: shadow_01 svg */}
          {/* <div className="absolute -bottom-40 left-0 flex aspect-21/9 w-full bg-customGradient bg-cover bg-no-repeat"></div> */}
          {/* Info: WII: shadow_01 svg */}
          {/* <div className="absolute h-full w-full ">
            <img
              className="w-1400px absolute right-0 top-0 flex h-fit bg-blend-color-dodge"
              alt="Shadow"
              src="/elements/shadow_01.svg"
            />
          </div> */}
          {/* Info: WIII: shadow_01 svg */}
          {/* <div className="h-[1227px] w-[1432px]">
            <div className="relative top-[-4px] h-[1131px] [background:linear-gradient(180deg,rgba(0,24,64,0)_32.5%,rgb(0,24,64)_85.5%)]">
              <img
                className="absolute left-0 top-0 h-[1079px] w-[856px] bg-blend-color-dodge"
                alt="Shadow"
                src="/elements/shadow_01.svg"
              />
            </div>
          </div> */}
          {/* Info: ---shadow_01 svg--- (20240318 - Shirley) */}
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

          <div className="items-around flex w-9/10 justify-center">
            {/* Info: iSunFA Call to action (20240319 - SHirley) */}
            <div
              ref={animeRef1}
              className={`${isAnimeRef1Visible ? `translate-x-0` : `-translate-x-140%`} z-5 flex h-screen w-3/5 flex-col items-start justify-start space-y-10 px-0 pb-12 pt-1/6 text-start transition-all duration-1000`}
            >
              <div className="flex flex-col space-y-5">
                {' '}
                <h1 className="text-6xl font-bold tracking-wider text-primaryYellow lg:text-7xl">
                  {t('LANDING_PAGE.MAIN_TITLE')}
                </h1>
                <h1 className="text-2xl font-bold tracking-widest text-hoverWhite lg:text-6xl">
                  {t('LANDING_PAGE.MAIN_SUBTITLE_1')}
                </h1>
              </div>
              <ul className="tablet:max-w-xl desktop:max-w-2xl max-w-md list-disc pl-3 text-base tracking-widest text-hoverWhite lg:text-base">
                <li>{t('LANDING_PAGE.MAIN_SUBTITLE_2_POINT_1')}</li>
                <li>{t('LANDING_PAGE.MAIN_SUBTITLE_2_POINT_2')}</li>
                <li>{t('LANDING_PAGE.MAIN_SUBTITLE_2_POINT_3')}</li>
                <li>{t('LANDING_PAGE.MAIN_SUBTITLE_2_POINT_4')}</li>
                <li>{t('LANDING_PAGE.MAIN_SUBTITLE_2_POINT_5')}</li>
              </ul>

              {/* <button
              className="flex items-center space-x-2 rounded-lg bg-primaryYellow px-6 py-3 font-bold text-secondaryBlue"
              type="button"
            > */}
              <Button className="flex space-x-3" disabled={IS_BUTTON_DISABLED_TEMP}>
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
              {/* </button> */}
            </div>
            {/* Info: iSunFA 大字 (20240318 - Shirley) */}
            <div className=""></div>
            <div className={`ml-1/12 mt-1/10 flex h-screen items-start `}>
              <img
                loading="lazy"
                src="/elements/isunfa_pop.svg"
                className={`aspect-0.87 w-9/10 grow mix-blend-soft-light max-md:mt-10 max-md:max-w-full ${isAnimeRef1Visible ? 'animate-slideBottomToTop' : 'hidden'}`}
              />
            </div>
          </div>
        </div>

        {/* Info:(20230815 - Shirley) How we work */}
        {/* <div className="absolute h-screen w-screen mix-blend-screen">
          <div className="absolute right-0 top-0 h-500px w-900px bg-light_01 bg-no-repeat bg-blend-color-dodge"></div>
        </div> */}
        {/* Info: ----- light_01 svg ----- (20240318 - Shirley) */}
        <div className="relative">
          {' '}
          <div className="absolute h-screen w-screen mix-blend-color-dodge">
            <div className="absolute right-0 top-0 aspect-0.87 w-1400px bg-light_01 bg-no-repeat bg-blend-color-dodge"></div>
          </div>
        </div>
        {/* Info: ----- light_01 svg ----- (20240318 - Shirley) */}
        <div className="container mx-auto flex h-fit w-full flex-col py-20 lg:pb-20 lg:pt-48">
          <h1 className="flex w-full justify-center pt-28 text-h1 font-bold tracking-wider text-white lg:text-h1">
            {t('LANDING_PAGE.HOW_WE_WORK_TITLE')}{' '}
          </h1>
          <div className="flex">
            <div className="relative ml-1/8 pt-40">
              {' '}
              <div className="flex flex-col justify-center">{verticalDotLine}</div>{' '}
              <div className="-mt-6.2rem flex flex-col justify-center">{verticalDotLine}</div>
              <div className="-mt-6.2rem flex flex-col justify-center">{verticalDotLine}</div>
            </div>

            <div className="mt-44 flex flex-col space-y-32">
              <div
                ref={animeRef21}
                className={`${isAnimeRef21Visible ? `translate-x-0 translate-y-0` : `translate-x-140% translate-y-140%`} mr-10 flex space-x-2 duration-1000`}
              >
                <div className={`relative h-300px w-600px`}>
                  <Image
                    src="/elements/how_we_work_1.png"
                    alt="how we work - privacy"
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </div>

                <div className="mt-20 flex max-w-lg flex-col space-y-5 lg:mt-20 lg:space-y-8">
                  {' '}
                  <p className="text-h3 leading-h3 text-primaryYellow lg:text-h1 lg:leading-h1">
                    {t('LANDING_PAGE.PRIVACY_BLOCK_TITLE_1')}
                  </p>
                  <p className="text-base text-white">
                    {t('LANDING_PAGE.PRIVACY_BLOCK_CONTENT_1')}
                  </p>
                </div>
              </div>

              <div
                ref={animeRef22}
                className={`${isAnimeRef22Visible ? `translate-x-0 translate-y-0` : `translate-x-140% translate-y-140%`} mr-10 flex space-x-2 duration-1000`}
              >
                <div className={`relative h-300px w-600px`}>
                  <Image
                    src="/elements/how_we_work_2.png"
                    alt="how we work - accuracy"
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                <div className="mt-20 flex max-w-lg flex-col space-y-5 lg:mt-20 lg:space-y-8">
                  {' '}
                  <p className="text-h3 leading-h3 text-primaryYellow lg:text-h1 lg:leading-h1">
                    {t('LANDING_PAGE.PRIVACY_BLOCK_TITLE_2')}
                  </p>
                  <p className="text-base text-white">
                    {t('LANDING_PAGE.PRIVACY_BLOCK_CONTENT_2')}
                  </p>
                </div>
              </div>

              <div
                ref={animeRef23}
                className={`${isAnimeRef23Visible ? `translate-x-0 translate-y-0` : `translate-x-140% translate-y-140%`} mr-10 flex space-x-2 duration-1000`}
              >
                <div className={`relative h-300px w-600px`}>
                  <Image
                    src="/elements/how_we_work_3.png"
                    alt="how we work - compliance"
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                <div className="mt-20 flex max-w-lg flex-col space-y-5 lg:mt-20 lg:space-y-8">
                  {' '}
                  <p className="text-h3 leading-h3 text-primaryYellow lg:text-h1 lg:leading-h1">
                    {t('LANDING_PAGE.PRIVACY_BLOCK_TITLE_3')}
                  </p>
                  <p className="text-base text-white">
                    {t('LANDING_PAGE.PRIVACY_BLOCK_CONTENT_3')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info: (20240315 - Shirley) Blocks with number animation */}
        <div className="mt-20 flex flex-col items-center space-y-28 scroll-smooth px-4 lg:w-full lg:flex-row lg:justify-evenly lg:space-x-14 lg:space-y-0 lg:overflow-x-auto lg:px-40 lg:py-20">
          {numberBlockList}

          {/* Info:(20240308 - Shirley) background img */}
          {/* <div className="absolute -right-20 top-48 h-255px w-900px rounded-2xl bg-101 bg-cover bg-no-repeat hidden lg:block" /> */}
        </div>

        {/* Info: ----- light_02 svg ----- (20240318 - Shirley) */}
        <div className="relative">
          {' '}
          <div className="absolute h-screen w-screen mix-blend-color-dodge">
            <div className="absolute -top-20 left-0 h-full w-1200px bg-light_02 bg-no-repeat bg-blend-color-dodge"></div>
          </div>
        </div>
        <div className="container mx-auto flex h-fit w-full flex-col py-20 lg:pb-20 lg:pt-20">
          {/* Info: ----- light_02 svg ----- (20240318 - Shirley) */}
          {/* Info:(20240315 - Shirley) Features Block */}
          <div className="mt-20 flex flex-col items-center space-y-16 px-4 pt-20 text-center lg:mb-40 lg:h-450px lg:px-20 lg:py-20">
            <div className="flex flex-col">
              <h3 className="text-h1 font-bold leading-h1 text-white">
                {t('LANDING_PAGE.FEATURES_SUBTITLE')}
              </h3>
              {/* <h2 className="text-2xl font-bold lg:text-5xl">{t('LANDING_PAGE.FEATURES_TITLE')}</h2> */}
            </div>
            <div className="flex justify-center pr-1/10">
              <div className="relative">
                <div className="relative h-515px w-865px">
                  <Image
                    src="/elements/mac.png"
                    alt="feature intro - mac"
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </div>

                <div className="relative bottom-19rem left-32rem h-300px w-432px">
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

          <div className="mx-20 mb-40 grid grid-cols-1 gap-20 lg:mx-40 lg:mt-40 lg:flex-1 lg:grid-cols-3 lg:gap-10">
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
          <div className="flex w-full flex-col flex-wrap content-center justify-center p-20 max-md:max-w-full max-md:px-5">
            <div className="mt-10 items-center justify-center px-16 py-2.5 text-center text-3xl font-semibold tracking-tighter text-white max-md:max-w-full max-md:px-5">
              {t('LANDING_PAGE.PARTNER_SECTION_TITLE')}
            </div>
            <div className="mb-4 mt-20 flex w-[388px] max-w-full justify-between gap-5 self-center max-md:mt-10">
              <img
                loading="lazy"
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/ac89e42fea1664fc20628447e4c467981b2a7917d2f218339003d8a10442c356?apiKey=0e17b0b875f041659e186639705112b1&"
                className="aspect-[3.85] w-[154px] max-w-full shrink-0 self-start"
              />
              <img
                loading="lazy"
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/e0f0f194cc2b06eb64fe288595d1376d36cfa208efdb59a1e38301d868537587?apiKey=0e17b0b875f041659e186639705112b1&"
                className="aspect-[3.7] w-[154px] max-w-full shrink-0"
              />
            </div>
          </div>
          {/* Info: ----- Partners (20240318 - Shirley) ----- */}

          {/* Info: ----- Carousel (20240318 - Shirley) ----- */}
          <div className="mt-20 flex w-full justify-center space-x-5">
            <div className="relative mt-20 h-400px w-400px">
              <Image
                src="/elements/contract_blue.svg"
                alt="contract_blue"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>{' '}
            <div className="max-w-700px">
              {' '}
              <Carousel autoSlide>
                {carouselItems.map(({ title, content }, i) => (
                  <Card key={i} title={t(title)} content={t(content)} />
                ))}
              </Carousel>
            </div>
          </div>
          {/* Info: ----- Carousel (20240318 - Shirley) ----- */}
        </div>

        {/* Info: ----- why iSunFA (20240318 - Shirley) ----- */}
        <div className="flex w-full flex-col justify-center px-16 py-20 max-md:max-w-full max-md:px-5">
          <div className="mx-5 mb-20 mt-32 max-md:my-10 max-md:mr-2.5 max-md:max-w-full">
            <div className="flex gap-5 max-md:flex-col max-md:gap-0">
              <div className="mt-24 flex w-6/12 flex-col max-md:ml-0 max-md:w-full">
                <div className="flex grow flex-col justify-center max-md:mt-10 max-md:max-w-full">
                  <div className="justify-center pt-2 text-5xl font-semibold leading-[51.92px] tracking-tighter text-white max-md:max-w-full">
                    {t('LANDING_PAGE.WHY_ISUNFA_SECTION_TITLE')}
                  </div>
                  <div className="mt-10 flex flex-col max-md:max-w-full">
                    <div className="flex gap-4 max-md:flex-wrap">
                      <div className="my-auto flex items-center justify-center">
                        <img
                          loading="lazy"
                          src="https://cdn.builder.io/api/v1/image/assets/TEMP/b880f4b7d821e02397c0aa900c3983624e79fa2188034ee58d5b17f48db59804?apiKey=0e17b0b875f041659e186639705112b1&"
                          className="aspect-square w-8"
                        />
                      </div>
                      <div className="w-fit grow justify-center text-base font-medium leading-6 tracking-normal text-slate-300 max-md:max-w-full">
                        {t('LANDING_PAGE.WHY_ISUNFA_CONTENT_1')}
                      </div>
                    </div>
                    <div className="mt-10 flex gap-4 max-md:flex-wrap">
                      <div className="my-auto flex items-center justify-center">
                        <img
                          loading="lazy"
                          src="https://cdn.builder.io/api/v1/image/assets/TEMP/b880f4b7d821e02397c0aa900c3983624e79fa2188034ee58d5b17f48db59804?apiKey=0e17b0b875f041659e186639705112b1&"
                          className="aspect-square w-8"
                        />
                      </div>
                      <div className="w-fit grow justify-center text-base font-medium leading-6 tracking-normal text-slate-300 max-md:max-w-full">
                        {t('LANDING_PAGE.WHY_ISUNFA_CONTENT_2')}
                      </div>
                    </div>
                    <div className="mt-10 flex gap-4 max-md:flex-wrap">
                      <div className="my-auto flex items-center justify-center">
                        <img
                          loading="lazy"
                          src="https://cdn.builder.io/api/v1/image/assets/TEMP/b880f4b7d821e02397c0aa900c3983624e79fa2188034ee58d5b17f48db59804?apiKey=0e17b0b875f041659e186639705112b1&"
                          className="aspect-square w-8"
                        />
                      </div>
                      <div className="w-fit grow justify-center text-base font-medium leading-6 tracking-normal text-slate-300 max-md:max-w-full">
                        {t('LANDING_PAGE.WHY_ISUNFA_CONTENT_3')}
                      </div>
                    </div>
                    <div className="mt-10 flex gap-4 max-md:flex-wrap">
                      <div className="my-auto flex items-center justify-center">
                        <img
                          loading="lazy"
                          src="https://cdn.builder.io/api/v1/image/assets/TEMP/b880f4b7d821e02397c0aa900c3983624e79fa2188034ee58d5b17f48db59804?apiKey=0e17b0b875f041659e186639705112b1&"
                          className="aspect-square w-8"
                        />
                      </div>
                      <div className="w-fit grow justify-center text-base font-medium leading-6 tracking-normal text-slate-300 max-md:max-w-full">
                        {t('LANDING_PAGE.WHY_ISUNFA_CONTENT_4')}
                      </div>
                    </div>
                    <div className="mt-10 flex gap-4 max-md:flex-wrap">
                      <div className="my-auto flex items-center justify-center">
                        <img
                          loading="lazy"
                          src="https://cdn.builder.io/api/v1/image/assets/TEMP/b880f4b7d821e02397c0aa900c3983624e79fa2188034ee58d5b17f48db59804?apiKey=0e17b0b875f041659e186639705112b1&"
                          className="aspect-square w-8"
                        />
                      </div>
                      <div className="w-fit grow justify-center text-base font-medium leading-6 tracking-normal text-slate-300 max-md:max-w-full">
                        {t('LANDING_PAGE.WHY_ISUNFA_CONTENT_5')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex w-1/2 flex-col max-md:ml-0 max-md:w-full">
                <img
                  loading="lazy"
                  src="/elements/partial_mac.png"
                  // srcSet="https://cdn.builder.io/api/v1/image/assets/TEMP/55b5c36e4b48f510985142e60e93b8e18b76a5d4d1adde370ca71347b1d791f3?apiKey=0e17b0b875f041659e186639705112b1&width=100 100w, https://cdn.builder.io/api/v1/image/assets/TEMP/55b5c36e4b48f510985142e60e93b8e18b76a5d4d1adde370ca71347b1d791f3?apiKey=0e17b0b875f041659e186639705112b1&width=200 200w, https://cdn.builder.io/api/v1/image/assets/TEMP/55b5c36e4b48f510985142e60e93b8e18b76a5d4d1adde370ca71347b1d791f3?apiKey=0e17b0b875f041659e186639705112b1&width=400 400w, https://cdn.builder.io/api/v1/image/assets/TEMP/55b5c36e4b48f510985142e60e93b8e18b76a5d4d1adde370ca71347b1d791f3?apiKey=0e17b0b875f041659e186639705112b1&width=800 800w, https://cdn.builder.io/api/v1/image/assets/TEMP/55b5c36e4b48f510985142e60e93b8e18b76a5d4d1adde370ca71347b1d791f3?apiKey=0e17b0b875f041659e186639705112b1&width=1200 1200w, https://cdn.builder.io/api/v1/image/assets/TEMP/55b5c36e4b48f510985142e60e93b8e18b76a5d4d1adde370ca71347b1d791f3?apiKey=0e17b0b875f041659e186639705112b1&width=1600 1600w, https://cdn.builder.io/api/v1/image/assets/TEMP/55b5c36e4b48f510985142e60e93b8e18b76a5d4d1adde370ca71347b1d791f3?apiKey=0e17b0b875f041659e186639705112b1&width=2000 2000w, https://cdn.builder.io/api/v1/image/assets/TEMP/55b5c36e4b48f510985142e60e93b8e18b76a5d4d1adde370ca71347b1d791f3?apiKey=0e17b0b875f041659e186639705112b1&"
                  className="absolute right-0 aspect-[1.18] w-800px grow self-stretch max-md:mt-10 max-md:max-w-full"
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
            <div className="absolute -top-24rem left-0 h-1200px w-1400px bg-light_04 bg-no-repeat bg-blend-color-dodge"></div>
          </div>
        </div>
        {/* Info: ----- light_04 svg ----- (20240318 - Shirley) */}
        {/* Info: ----- Contact form ----- (20240318 - Shirley) */}
        <div id="contact-us" className="mb-20 h-1000px">
          <div className="relative h-500px w-full">
            {' '}
            <Image
              src="/elements/contact_bg.svg"
              alt="contact_bg"
              fill
              style={{ objectFit: 'cover' }}
            />
            <div className="absolute inset-0 flex justify-center">
              {' '}
              <ContactForm />
            </div>
          </div>
        </div>
        {/* Info: ----- Contact form ----- (20240318 - Shirley) */}

        {/* Info:(20230711 - Shirley) Footer */}
        <LandingFooter />
      </div>
    </div>
  );
}

export default LandingPageBody;
