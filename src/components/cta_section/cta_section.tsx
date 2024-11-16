import Link from 'next/link';
import { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { TranslateFunction } from '@/interfaces/locale';
import { Button } from '@/components/button/button';
import { ISUNFA_ROUTE } from '@/constants/url';
import Image from 'next/image';
import { UserContext } from '@/contexts/user_context';
import { FaArrowRight } from 'react-icons/fa6';

const CTASection = () => {
  const { t }: { t: TranslateFunction } = useTranslation('landing_page');

  const animeRef1 = useRef(null);
  const [isAnimeRef1Visible, setIsAnimeRef1Visible] = useState(false);
  const { isSignIn } = useContext(UserContext);

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
        className={`overflow-x-hidden ${isAnimeRef1Visible ? `translate-x-0` : `-translate-x-140%`} z-5 flex w-full flex-col items-start justify-start space-y-10 px-0 pb-12 pt-2/5 text-start transition-all duration-1000 md:-ml-40 md:w-3/5 md:pt-1/5 lg:-ml-0 lg:pt-1/6`}
      >
        <div className="ml-10">
          <div className="flex flex-col md:space-y-5">
            <h1 className="text-h4 font-bold tracking-wider text-orange-400 md:text-6xl lg:text-7xl">
              {t('landing_page:LANDING_PAGE.MAIN_TITLE')}
            </h1>
            <h1 className="text-h6 font-bold tracking-widest text-navy-blue-25 md:text-2xl lg:text-6xl">
              {t('landing_page:LANDING_PAGE.MAIN_SUBTITLE_1')}
            </h1>
          </div>
          <ol className="mt-8 max-w-md list-disc space-y-2 text-base tracking-widest text-navy-blue-25 md:max-w-xl lg:mt-10 lg:max-w-2xl lg:text-base">
            <li>{t('landing_page:LANDING_PAGE.MAIN_SUBTITLE_2_POINT_1')}</li>
            <li>{t('landing_page:LANDING_PAGE.MAIN_SUBTITLE_2_POINT_2')}</li>
            <li>{t('landing_page:LANDING_PAGE.MAIN_SUBTITLE_2_POINT_3')}</li>
            <li>{t('landing_page:LANDING_PAGE.MAIN_SUBTITLE_2_POINT_4')}</li>
            <li>{t('landing_page:LANDING_PAGE.MAIN_SUBTITLE_2_POINT_5')}</li>
          </ol>
        </div>

        <Link
          href={isSignIn ? ISUNFA_ROUTE.DASHBOARD : ISUNFA_ROUTE.LOGIN}
          className="z-5 flex w-full justify-center px-5 md:w-auto"
        >
          <Button
            variant="default"
            className="flex w-full space-x-3 text-base leading-6 tracking-normal text-button-text-secondary hover:text-button-text-invert lg:w-fit"
          >
            <p>{t('landing_page:NAV_BAR.TRY_NOW')}</p>
            <FaArrowRight size={16} />
          </Button>
        </Link>
      </div>
      {/* Info: (20240318 - Shirley) iSunFA 大字 */}
      <div className={`mt-1/8 hidden items-start lg:flex`}>
        <Image
          alt="isunfa_pop"
          src="/elements/isunfa_pop.svg"
          width={582}
          height={670}
          className={`aspect-0.87 w-9/10 grow mix-blend-soft-light max-md:mt-10 max-md:max-w-full ${isAnimeRef1Visible ? 'animate-slideBottomToTop' : 'hidden'}`}
        />
      </div>
    </div>
  );
};

export default CTASection;
