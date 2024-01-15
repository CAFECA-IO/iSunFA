import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';
import { useTranslation } from 'next-i18next';
import LandingFooter from '../landing_footer/landing_footer';
import {
  SCROLL_END,
  massiveDataContent,
  servicesContent,
  whyUsContent,
} from '../../constants/config';
import { TranslateFunction } from '../../interfaces/locale';

function LandingPageBody() {
  const { t }: { t: TranslateFunction } = useTranslation('common');
  const scrl = useRef<HTMLDivElement>(null);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  /* Info:(20230815 - Julian) slide X scroll function */
  const slide = (shift: number) => {
    if (scrl.current) scrl.current.scrollLeft += shift;
  };

  useEffect(() => {
    // Info: return `undefined` to fit the eslint rule `consistent-return` (20240115 - Shirley)
    if (!scrl.current) return undefined;

    /* Info:(20230815 - Julian) 設定監聽事件，將捲軸位置更新到 scrollLeft */
    const { scrollLeft } = scrl.current; // Destructuring here
    const onScroll = () => setScrollLeftState(scrollLeft);
    scrl.current.addEventListener('scroll', onScroll);

    return () => {
      if (scrl.current) scrl.current.removeEventListener('scroll', onScroll);
    };
  }, []);

  /* Info:(20230815 - Julian) Slide Function */
  const slideLeft = () => slide(-200);
  const slideRight = () => slide(200);

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

  const servicesList = servicesContent.map(({ image, alt, description }, index) => (
    <div
      // Info: (20240112 - Shirley) it's ok to use index as key in this case
      // eslint-disable-next-line react/no-array-index-key
      key={index}
      className="relative flex flex-col items-center rounded-2xl bg-purpleLinear p-10 drop-shadow-101"
    >
      {/* Info:(20230815 - Julian) Image */}
      <div className="absolute -top-20 h-220px w-220px">
        <Image
          src={image}
          alt={alt}
          fill
          style={{ objectFit: 'cover', objectPosition: 'center bottom' }}
        />
      </div>
      {/* Info:(20230815 - Julian) placeholder */}
      <div className="h-130px" />
      {/* Info:(20230815 - Julian) Description */}
      <p className="w-220px text-center text-xl">{t(description)}</p>
    </div>
  ));

  const whyUsList = whyUsContent.map(({ image, alt, description }, index) => (
    // TODO: (20240112 - Shirley) temp solution
    // eslint-disable-next-line react/no-array-index-key
    <div key={index} className="flex flex-col items-center space-y-6 text-center">
      <div className="relative h-80px w-80px">
        <Image src={image} alt={alt} fill style={{ objectFit: 'contain' }} />
      </div>

      <p>{t(description)}</p>
    </div>
  ));

  return (
    <div className="flex min-h-screen w-screen flex-col overflow-hidden font-inter bg-secondaryBlue">
      {/* Info:(20230815 - Julian) Pipe Background Image */}
      <div className="relative flex h-140vh w-full flex-col items-center bg-pipe bg-auto bg-center bg-no-repeat lg:bg-cover lg:bg-top-4">
        {/* Info:(20230711 - Julian) Main Title Block */}
        <div className="flex h-screen w-full flex-col items-center justify-center space-y-10 px-4 py-12 text-center">
          <h6 className="hollowYellow font-roboto text-6xl font-bold tracking-wider lg:text-7xl">
            {t('LANDING_PAGE.MAIN_TITLE')}
          </h6>
          <h1 className="text-2xl font-bold tracking-widest text-hoverWhite lg:text-6xl">
            {t('LANDING_PAGE.MAIN_SUBTITLE_1')}
          </h1>
          <h1 className="text-2xl font-bold tracking-widest text-hoverWhite lg:text-6xl">
            {t('LANDING_PAGE.MAIN_SUBTITLE_2')}
          </h1>
          {/* Info:(20230711 - Julian) Arrow */}
          <Link href="#iSunFA_101" scroll={false} className="absolute bottom-80 lg:bottom-20">
            <Image src="/animations/arrow_down.gif" alt="scroll arrow" width={50} height={50} />
          </Link>
        </div>
      </div>

      <div className="flex h-fit w-full flex-col px-5 items-center lg:pb-52">
        {/* Info:(20230815 - Julian) iSunFA 101 Block */}
        <div id="iSunFA_101" className="w-full py-0 lg:px-0 lg:py-120px">
          <div
            // style={{ minHeight: '500px', borderRadius: '25px' }}
            className="flex flex-col items-center space-y-10 bg-101 bg-cover bg-center bg-no-repeat px-5 py-28 drop-shadow-101 lg:min-h-500px min-h-200px lg:flex-row lg:space-x-20 lg:space-y-0 lg:py-20 lg:px-28 xl:px-40"
          >
            <div className="flex h-full flex-col items-center space-y-5 lg:space-y-10 whitespace-nowrap lg:w-1/2 lg:items-start">
              <h2 className="text-32px font-bold lg:text-6xl">
                {t('LANDING_PAGE.iSunFA_101_TITLE')}:
              </h2>
              <div className="w-fit rounded-xl bg-primaryYellow px-5 py-10px text-lg text-secondaryBlue font-bold">
                {t('LANDING_PAGE.iSunFA_101_SUBTITLE')}
              </div>
            </div>
            <div className="lg:w-2/3">
              <p className="text-base lg:text-xl">{t('LANDING_PAGE.iSunFA_101_CONTENT')}</p>
            </div>
          </div>
        </div>

        {/* Info:(20230711 - Julian) Features Block */}
        <div className="flex flex-col items-center space-y-16 px-4 py-20 text-center font-roboto lg:h-450px lg:px-20">
          <div className="flex flex-col">
            <h3 className="text-xl font-bold text-primaryYellow">
              {t('LANDING_PAGE.FEATURES_SUBTITLE')}
            </h3>
            <h2 className="text-2xl font-bold lg:text-5xl">{t('LANDING_PAGE.FEATURES_TITLE')}</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">{massiveDataList}</div>
        </div>
      </div>

      <div className="flex h-fit w-full flex-col items-center pb-100px">
        {/* Info:(20230815 - Julian) Services Block */}
        <div className="relative flex w-full flex-col space-y-20 py-20">
          <div className="flex items-center justify-center space-x-20 px-20">
            {/* Info:(20230711 - Julian) Services Title */}
            <h2 className="text-center text-2xl font-bold leading-loose lg:text-6xl">
              {t('LANDING_PAGE.SERVICES_TITLE_1')}
              <span className="text-primaryYellow">
                {t('LANDING_PAGE.SERVICES_TITLE_HIGHLIGHT')}
              </span>
              {t('LANDING_PAGE.SERVICES_TITLE_2')}
            </h2>
            {/* Info:(20230711 - Julian) Arrow button, only show on desktop */}
            <div className="hidden items-center space-x-6 lg:flex">
              <button
                type="button"
                disabled={scrollLeftState <= 0}
                onClick={slideLeft}
                className="rounded border border-hoverWhite p-3 text-hoverWhite transition-all duration-150 ease-in-out hover:border-primaryBlue hover:text-primaryBlue disabled:opacity-50 disabled:hover:border-hoverWhite disabled:hover:text-hoverWhite"
              >
                <AiOutlineLeft className="text-2xl" />
              </button>
              <button
                type="button"
                disabled={scrollLeftState >= SCROLL_END}
                onClick={slideRight}
                className="rounded border border-hoverWhite p-3 text-hoverWhite transition-all duration-150 ease-in-out hover:border-primaryBlue hover:text-primaryBlue disabled:opacity-50 disabled:hover:border-hoverWhite disabled:hover:text-hoverWhite"
              >
                <AiOutlineRight className="text-2xl" />
              </button>
            </div>
          </div>
          {/* Info:(20230815 - Julian) horizontal scroll part */}
          <div
            ref={scrl}
            className="flex flex-col items-center space-y-28 scroll-smooth px-4 lg:flex-row lg:space-x-10 lg:space-y-0 lg:overflow-x-auto lg:px-40 lg:py-20"
          >
            {servicesList}
            {/* Info:(20230815 - Julian) pink background */}
            <div className="absolute -right-20 top-60 -z-10 hidden h-255px w-700px rounded-2xl bg-101 bg-cover bg-no-repeat lg:block" />
          </div>
        </div>

        {/* Info:(20230815 - Julian) Why iSunFA Block */}
        <div className="flex w-full flex-col items-center py-100px lg:flex-row lg:pl-20">
          {/* Info:(20230815 - Julian) Mobile Why iSunFA Title */}
          <div className="mb-20 flex w-full flex-col items-center space-y-10 lg:hidden">
            <h2 className="text-2xl font-bold">
              {t('LANDING_PAGE.WHY_iSunFA_TITLE')}
              <span className="text-primaryYellow">
                {t('LANDING_PAGE.WHY_iSunFA_TITLE_HIGHLIGHT')}
              </span>
            </h2>
            <div className="relative h-150px w-400px">
              <Image
                src="/elements/robot_hand.png"
                alt="a robot hand"
                fill
                style={{ objectFit: 'contain', objectPosition: 'right center' }}
              />
            </div>
          </div>
          {/* Info:(20230815 - Julian) Why iSunFA List */}
          <div className="mx-auto grid grid-cols-1 gap-10 lg:flex-1 lg:grid-cols-2">
            {whyUsList}
          </div>
          {/* Info:(20230815 - Julian) Desktop Why iSunFA Title */}
          <div className="ml-20 hidden flex-col space-y-10 lg:flex">
            <h2 className="text-6xl font-bold">
              {t('LANDING_PAGE.WHY_iSunFA_TITLE')}
              <span className="text-primaryYellow">
                {t('LANDING_PAGE.WHY_iSunFA_TITLE_HIGHLIGHT')}
              </span>
            </h2>
            <Image src="/elements/robot_hand.png" alt="a robot hand" width={500} height={500} />
          </div>
        </div>
      </div>

      {/* Info:(20230711 - Julian) Footer */}
      <LandingFooter />
    </div>
  );
}

export default LandingPageBody;
