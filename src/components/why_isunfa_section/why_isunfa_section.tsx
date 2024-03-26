import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { TranslateFunction } from '../../interfaces/locale';

const WhyISunFASection = () => {
  const { t }: { t: TranslateFunction } = useTranslation('common');

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

  const scrollHandler = () => {
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
  };

  useEffect(() => {
    window.addEventListener('scroll', scrollHandler, { passive: true });
    return () => {
      window.removeEventListener('scroll', scrollHandler);
    };
  }, []);

  return (
    <div className="flex w-full flex-col justify-center px-16 max-md:max-w-full max-md:px-5 md:py-20">
      <div className="mx-5 mb-20 mt-32 max-md:my-10 max-md:mr-2.5 max-md:max-w-full">
        <div className="flex gap-5 max-lg:flex-col max-md:gap-0">
          <div className="mt-24 flex flex-col max-lg:ml-0 lg:w-1/2">
            <div className="flex grow flex-col justify-center max-md:mt-10 max-md:max-w-full lg:w-full">
              <div
                ref={animeRef51}
                className={`overflow-x-hidden ${isAnimeRef51Visible ? `translate-x-0` : `md:-translate-x-140%`} flex w-full justify-center pt-2 text-h6 font-semibold leading-h6 tracking-tighter text-white duration-1000 max-md:max-w-full md:justify-start md:text-5xl md:leading-h1`}
              >
                {t('LANDING_PAGE.WHY_ISUNFA_SECTION_TITLE')}
              </div>

              <div className="mt-10 flex flex-col space-y-5 max-md:max-w-full">
                <div
                  ref={animeRef51}
                  className={`overflow-x-hidden ${isAnimeRef51Visible ? `translate-x-0` : `md:-translate-x-140%`} flex gap-4 duration-1000 max-md:flex-wrap`}
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
                  className={`overflow-x-hidden ${isAnimeRef52Visible ? `translate-x-0` : `md:-translate-x-140%`} flex gap-4 duration-1000 max-md:flex-wrap`}
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
                  className={`overflow-x-hidden ${isAnimeRef53Visible ? `translate-x-0` : `md:-translate-x-140%`} flex gap-4 duration-1000 max-md:flex-wrap`}
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
                  className={`overflow-x-hidden ${isAnimeRef54Visible ? `translate-x-0` : `md:-translate-x-140%`} flex gap-4 duration-1000 max-md:flex-wrap`}
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
                  className={`overflow-x-hidden ${isAnimeRef55Visible ? `translate-x-0` : `md:-translate-x-140%`} flex gap-4 duration-1000 max-md:flex-wrap`}
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
  );
};

export default WhyISunFASection;
