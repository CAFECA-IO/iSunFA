import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { TranslateFunction } from '../../interfaces/locale';
import { IS_BUTTON_DISABLED_TEMP } from '../../constants/display';
import { Button } from '../button/button';
import { cn } from '../../lib/utils/common';

const CTASection = () => {
  const { t }: { t: TranslateFunction } = useTranslation('common');

  const animeRef1 = useRef(null);
  const [isAnimeRef1Visible, setIsAnimeRef1Visible] = useState(false);

  useEffect(() => {
    const waitForCTA = setTimeout(() => {
      setIsAnimeRef1Visible(true);
    }, 500);
    return () => {
      clearTimeout(waitForCTA);
    };
  }, []);

  return (
    <div className="flex w-full justify-center lg:w-9/10">
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
          src="/elements/isunfa_pop.svg"
          className={`aspect-0.87 w-9/10 grow mix-blend-soft-light max-md:mt-10 max-md:max-w-full ${isAnimeRef1Visible ? 'animate-slideBottomToTop' : 'hidden'}`}
        />
      </div>
    </div>
  );
};

export default CTASection;
