import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { TbArrowBack } from 'react-icons/tb';
import { ISUNFA_ROUTE } from '@/constants/url';
import LandingNavbar from '@/components/landing_page_v2/landing_navbar';
import LandingFooter from '@/components/landing_page_v2/landing_footer';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import ScrollToTopButton from '@/components/landing_page_v2/scroll_to_top';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';
import BlueStarList from '@/components/landing_page_v2/blue_star_list';

const TermsOfServicePageBody: React.FC = () => {
  const { t } = useTranslation(['landing_page_2', 'terms']);

  const formatText = (text: string) => {
    return text.split(/(\*\*.*?\*\*)/g).map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          // eslint-disable-next-line react/no-array-index-key
          <span key={index} className="font-bold text-text-brand-primary-lv3">
            {part.slice(2, -2)}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="relative flex flex-auto flex-col bg-landing-page-black py-32px font-dm-sans text-landing-page-white">
      {/* Info: (20250220 - Julian) Background */}
      <div className="absolute inset-x-0 top-0 h-546px w-full bg-privacy-policy bg-contain bg-top bg-no-repeat md:h-670px lg:h-1024px"></div>

      {/* Info: (20250220 - Julian) Header */}
      <LandingNavbar />

      <main className="z-10 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col gap-100px px-150px py-100px">
          {/* Info: (20250220 - Julian) Title */}
          <div className="flex flex-col gap-lv-3">
            <LinearGradientText size={LinearTextSize.XL} align={TextAlign.LEFT}>
              {t('terms:TERMS_OF_SERVICE_PAGE.MAIN_TITLE')}
            </LinearGradientText>
            <p className="text-xl font-medium">{t('terms:TERMS_OF_SERVICE_PAGE.MAIN_DESC')}</p>
          </div>

          {/* Info: (20250220 - Julian) Content */}
          <ol className="ml-24px flex list-decimal flex-col gap-80px text-xl leading-10 text-landing-page-white">
            <li>
              <p>{formatText(t('terms:TERMS_OF_SERVICE_PAGE.TEXT_01_01'))}</p>
              <p>{formatText(t('terms:TERMS_OF_SERVICE_PAGE.TEXT_01_02'))}</p>
            </li>
            <li>{formatText(t('terms:TERMS_OF_SERVICE_PAGE.TEXT_02'))}</li>
            <li>{formatText(t('terms:TERMS_OF_SERVICE_PAGE.TEXT_03'))}</li>
            <li>{formatText(t('terms:TERMS_OF_SERVICE_PAGE.TEXT_04'))}</li>
            <li>{formatText(t('terms:TERMS_OF_SERVICE_PAGE.TEXT_05'))}</li>
            <li>{formatText(t('terms:TERMS_OF_SERVICE_PAGE.TEXT_06'))}</li>
            <li>{formatText(t('terms:TERMS_OF_SERVICE_PAGE.TEXT_07'))}</li>
            <li>{formatText(t('terms:TERMS_OF_SERVICE_PAGE.TEXT_08'))}</li>
            <li>{formatText(t('terms:TERMS_OF_SERVICE_PAGE.TEXT_09'))}</li>
            <li>{formatText(t('terms:TERMS_OF_SERVICE_PAGE.TEXT_10'))}</li>
            <li>{formatText(t('terms:TERMS_OF_SERVICE_PAGE.TEXT_11'))}</li>
            <li>{formatText(t('terms:TERMS_OF_SERVICE_PAGE.TEXT_12'))}</li>
            <li>{formatText(t('terms:TERMS_OF_SERVICE_PAGE.TEXT_13'))}</li>
            <li>{formatText(t('terms:TERMS_OF_SERVICE_PAGE.TEXT_14'))}</li>
            <li>
              {formatText(t('terms:TERMS_OF_SERVICE_PAGE.TEXT_15'))}
              <BlueStarList
                listItem={[
                  t('terms:TERMS_OF_SERVICE_PAGE.TEXT_15_LI_01'),
                  t('terms:TERMS_OF_SERVICE_PAGE.TEXT_15_LI_02'),
                ]}
              />
            </li>
          </ol>

          {/* Info: (20250220 - Julian) Back Button */}
          <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
            <LandingButton
              type="button"
              variant="primary"
              className="mx-auto whitespace-nowrap px-60px text-center text-base font-bold"
            >
              <TbArrowBack size={28} />
              {t('common:COMMON.BACK')}
            </LandingButton>
          </Link>
        </div>

        {/* Info: (20250220 - Julian) Footer */}
        <LandingFooter />
        <ScrollToTopButton />
      </main>
    </div>
  );
};

export default TermsOfServicePageBody;
