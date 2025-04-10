import React from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import LandingNavbar from '@/components/landing_page_v2/landing_navbar';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';
import { ISUNFA_ROUTE } from '@/constants/url';

const FinishPage: React.FC = () => {
  const { t } = useTranslation(['hiring']);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>iSunFA - {t('hiring:JOIN_US_PAGE.HEAD_TITLE')}</title>
      </Head>

      <div className="relative flex min-h-screen flex-auto flex-col bg-landing-page-black py-32px font-dm-sans text-landing-page-white">
        {/* Info: (20250331 - Julian) Background */}
        <div className="absolute inset-x-0 top-0 h-full w-full bg-finish bg-contain bg-bottom bg-no-repeat"></div>

        {/* Info: (20250331 - Julian) Header */}
        <LandingNavbar />

        <main className="z-10 flex flex-1 flex-col items-center justify-center gap-48px overflow-hidden">
          <div className="flex w-min flex-col items-center gap-lv-4 px-100px text-center">
            <LinearGradientText
              align={TextAlign.CENTER}
              size={LinearTextSize.XL}
              className="whitespace-nowrap"
            >
              {t('hiring:FINISH_PAGE.MAIN_TITLE')}
            </LinearGradientText>
            <p className="text-sm tracking-wider md:text-base lg:text-xl">
              {t('hiring:FINISH_PAGE.TEXT')}
            </p>
          </div>
          <Link href={ISUNFA_ROUTE.JOIN_US}>
            <LandingButton type="button" variant="primary" className="font-bold">
              {t('hiring:FINISH_PAGE.DONE_BTN')}
            </LandingButton>
          </Link>
        </main>
      </div>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['landing_page_v2', 'hiring', 'common'])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default FinishPage;
