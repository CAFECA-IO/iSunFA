/* eslint-disable */
import Head from 'next/head';
import Image from 'next/image';
import LandingNavBar from '../components/landing_nav_bar/landing_nav_bar';
import LandingFooter from '../components/landing_footer/landing_footer';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { ILocale, TranslateFunction } from '../interfaces/locale';

const Custom404 = () => {
  const { t }: { t: TranslateFunction } = useTranslation('common');
  const headTitle = `${t('ERROR_PAGE.HEAD_TITLE')} - iSunFA`;

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <title>{headTitle}</title>
      </Head>

      {/* Info:(20230731 - Julian) Navbar */}
      <LandingNavBar />

      <main className="flex min-h-screen flex-col justify-between">
        <div className="flex h-full w-full flex-1 flex-col items-center justify-center overflow-hidden font-inter">
          <div className="">
            <Image src="/animations/404.gif" width={150} height={74} alt="404" />
          </div>
          <div className="flex flex-col items-center space-y-6 px-4 lg:space-y-2">
            <h1 className="text-40px font-bold text-primaryBlue">{t('ERROR_PAGE.TITLE')}</h1>
            <p className="text-center text-xl text-hoverWhite">{t('ERROR_PAGE.SUBTITLE')}</p>
          </div>
        </div>
      </main>
      {/* Info:(20230731 - Julian) Footer */}
      <LandingFooter />
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common'])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default Custom404;
