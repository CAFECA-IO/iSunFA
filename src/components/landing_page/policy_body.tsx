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
import Divider from '@/components/landing_page/divider';

// Info: (20250220 - Julian) 分類列表
const CategoriesList: React.FC<{ leftList: string[]; rightList: string[] }> = ({
  leftList,
  rightList,
}) => {
  return (
    <div className="mt-40px grid grid-cols-2 gap-80px rounded-md border border-landing-page-white px-40px py-20px">
      {/* Info: (20250219 - Julian) Left List */}
      <ul className="ml-20px flex list-outside list-disc flex-col gap-40px">
        {leftList.map((item, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <li key={index}>{item}</li>
        ))}
      </ul>
      {/* Info: (20250219 - Julian) Right List */}
      <ul className="ml-20px flex list-outside list-disc flex-col gap-40px">
        {rightList.map((item, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

const PrivacyPolicyPageBody: React.FC = () => {
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
      {/* Info: (20250219 - Julian) Background */}
      <div className="absolute inset-x-0 top-0 h-546px w-full bg-privacy-policy bg-contain bg-top bg-no-repeat md:h-670px lg:h-1024px"></div>

      {/* Info: (20250219 - Julian) Header */}
      <LandingNavbar />

      <main className="z-10 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col gap-100px px-150px py-100px">
          {/* Info: (20250219 - Julian) Title */}
          <div className="flex flex-col gap-lv-3">
            <LinearGradientText size={LinearTextSize.XL} align={TextAlign.LEFT}>
              {t('terms:PRIVACY_POLICY_PAGE.MAIN_TITLE')}
            </LinearGradientText>
            <p className="text-xl font-medium">{t('terms:PRIVACY_POLICY_PAGE.MAIN_DESC')}</p>
          </div>

          {/* Info: (20250219 - Julian) Content */}
          <div className="flex flex-col gap-80px tracking-wide">
            {/* Info: (20250219 - Julian) Where does this policy apply */}
            <Divider text={t('terms:PRIVACY_POLICY_PAGE.DIVIDER_01')} />
            <ol className="ml-24px flex list-decimal flex-col gap-80px text-xl leading-10 text-landing-page-white">
              <li>{formatText(t('terms:PRIVACY_POLICY_PAGE.TEXT_01'))}</li>
            </ol>

            {/* Info: (20250219 - Julian) How might my personal information would be used */}
            <Divider text={t('terms:PRIVACY_POLICY_PAGE.DIVIDER_02')} />
            <ol className="ml-24px flex list-decimal flex-col gap-80px text-xl leading-10 text-landing-page-white">
              {/* Info: (20250219 - Julian) 1. */}
              <li>
                {formatText(t('terms:PRIVACY_POLICY_PAGE.TEXT_02_01'))}
                <BlueStarList
                  listItem={[
                    t('terms:PRIVACY_POLICY_PAGE.TEXT_02_01_LI_01'),
                    t('terms:PRIVACY_POLICY_PAGE.TEXT_02_01_LI_02'),
                    t('terms:PRIVACY_POLICY_PAGE.TEXT_02_01_LI_03'),
                  ]}
                />
              </li>
              {/* Info: (20250219 - Julian) 2. */}
              <li>{formatText(t('terms:PRIVACY_POLICY_PAGE.TEXT_02_02'))}</li>
              {/* Info: (20250219 - Julian) 3. */}
              <li>
                {formatText(t('terms:PRIVACY_POLICY_PAGE.TEXT_02_03'))}
                <BlueStarList
                  listItem={[
                    t('terms:PRIVACY_POLICY_PAGE.TEXT_02_03_LI_01'),
                    t('terms:PRIVACY_POLICY_PAGE.TEXT_02_03_LI_02'),
                  ]}
                />
              </li>
            </ol>

            {/* Info: (20250219 - Julian) How can I manage my personal information */}
            <Divider text={t('terms:PRIVACY_POLICY_PAGE.DIVIDER_03')} />
            <ol className="ml-24px flex list-decimal flex-col gap-80px text-xl leading-10 text-landing-page-white">
              {/* Info: (20250219 - Julian) 1. */}
              <li>{formatText(t('terms:PRIVACY_POLICY_PAGE.TEXT_03_01'))}</li>
              {/* Info: (20250219 - Julian) 2. */}
              <li>{formatText(t('terms:PRIVACY_POLICY_PAGE.TEXT_03_02'))}</li>
              {/* Info: (20250219 - Julian) 3. */}
              <li>{formatText(t('terms:PRIVACY_POLICY_PAGE.TEXT_03_03'))}</li>
              {/* Info: (20250219 - Julian) 4. */}
              <li>{formatText(t('terms:PRIVACY_POLICY_PAGE.TEXT_03_04'))}</li>
              {/* Info: (20250219 - Julian) 5. */}
              <li>{formatText(t('terms:PRIVACY_POLICY_PAGE.TEXT_03_05'))}</li>
            </ol>

            {/* Info: (20250219 - Julian) What personal information would we collect */}
            <Divider text={t('terms:PRIVACY_POLICY_PAGE.DIVIDER_04')} />
            <ol className="ml-24px flex list-decimal flex-col gap-80px text-xl leading-10 text-landing-page-white">
              {/* Info: (20250219 - Julian) 1. */}
              <li>
                {t('terms:PRIVACY_POLICY_PAGE.TEXT_04_01')}
                <CategoriesList
                  leftList={[
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_01'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_02'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_03'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_04'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_05'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_06'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_07'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_08'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_09'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_10'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_11'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_12'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_13'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_14'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_15'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_16'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_17'),
                  ]}
                  rightList={[
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_18'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_19'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_20'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_21'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_22'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_23'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_24'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_25'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_26'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_27'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_28'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_29'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_30'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_31'),
                    t('terms:PRIVACY_POLICY_PAGE.PERSONAL_DATA_32'),
                  ]}
                />
              </li>
              {/* Info: (20250219 - Julian) 2. */}
              <li>
                {t('terms:PRIVACY_POLICY_PAGE.TEXT_04_02')}
                <CategoriesList
                  leftList={[
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_01'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_02'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_03'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_04'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_05'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_06'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_07'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_08'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_09'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_10'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_11'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_12'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_13'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_14'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_15'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_16'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_17'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_18'),
                  ]}
                  rightList={[
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_19'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_20'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_21'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_22'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_23'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_24'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_25'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_26'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_27'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_28'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_29'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_30'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_31'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_32'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_33'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_34'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_35'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_36'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_37'),
                    t('terms:PRIVACY_POLICY_PAGE.PURPOSE_38'),
                  ]}
                />
              </li>
            </ol>

            {/* Info: (20250219 - Julian) What personal information would we collect */}
            <Divider text={t('terms:PRIVACY_POLICY_PAGE.DIVIDER_05')} />
            <div className="flex flex-col gap-80px text-xl leading-10 text-landing-page-white">
              <p>{formatText(t('terms:PRIVACY_POLICY_PAGE.TEXT_05_01'))}</p>
              <p>{formatText(t('terms:PRIVACY_POLICY_PAGE.TEXT_05_02'))}</p>
            </div>
          </div>

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

        {/* Info: (20250219 - Julian) Footer */}
        <LandingFooter />
        <ScrollToTopButton />
      </main>
    </div>
  );
};

export default PrivacyPolicyPageBody;
