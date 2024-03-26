import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { TranslateFunction } from '../../interfaces/locale';

const PartnersSection = () => {
  const { t }: { t: TranslateFunction } = useTranslation('common');

  const animeRef41 = useRef(null);
  const [isAnimeRef41Visible, setIsAnimeRef41Visible] = useState(false);
  const animeRef42 = useRef(null);
  const [isAnimeRef42Visible, setIsAnimeRef42Visible] = useState(false);

  const scrollHandler = () => {
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
  };

  useEffect(() => {
    window.addEventListener('scroll', scrollHandler, { passive: true });
    return () => {
      window.removeEventListener('scroll', scrollHandler);
    };
  }, []);

  return (
    <div className="flex w-full flex-col flex-wrap content-center justify-center pt-10 max-md:max-w-full max-md:px-5 md:p-20">
      <div
        ref={animeRef41}
        // Info: 從左邊移到中間的動畫 (20240319 - Shirley)
        className={`overflow-x-hidden ${isAnimeRef41Visible ? `translate-x-0` : `md:-translate-x-140%`} mt-10 items-center justify-center px-16 py-2.5 text-center text-h6 font-semibold tracking-tighter text-white duration-1000 max-md:max-w-full max-md:px-5 md:text-3xl`}
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
          className={`${isAnimeRef42Visible ? `translate-x-0` : `md:-translate-x-100%`} duration-1000`}
        />
        <Image
          width={154}
          height={40}
          alt="partner logo"
          loading="lazy"
          src="/elements/partner_2.svg"
          className={`${isAnimeRef42Visible ? `translate-x-0` : `md:-translate-x-100%`} duration-1000`}
        />
      </div>
    </div>
  );
};

export default PartnersSection;
