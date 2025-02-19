import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import LandingNavbar from '@/components/landing_page_v2/landing_navbar';
import LandingFooter from '@/components/landing_page_v2/landing_footer';
import ScrollToTopButton from '@/components/landing_page_v2/scroll_to_top';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';

const PrivacyPolicyDivider: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="flex w-full items-center gap-lv-4">
      <div className="flex items-center gap-8px">
        <Image src="/icons/annoncement-megaphone.svg" alt="megaphone_icon" width={24} height={24} />
        <p className="text-sm font-medium">{text}</p>
      </div>
      <hr className="flex-1 border-landing-page-white" />
    </div>
  );
};

const PrivacyPolicyPageBody: React.FC = () => {
  const { t } = useTranslation(['landing_page_2', 'terms']);

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
              {t('terms:PRIVACY_POLICY.MAIN_TITLE')}
            </LinearGradientText>
            <p className="text-xl font-medium">{t('terms:PRIVACY_POLICY.MAIN_DESC')}</p>
          </div>

          {/* Info: (20250219 - Julian) Content */}
          <div className="flex flex-col gap-80px tracking-wide">
            {/* Info: (20250219 - Julian) Where does this policy apply */}
            <PrivacyPolicyDivider text={t('Where does this policy apply')} />
            <ol className="flex list-decimal flex-col gap-80px text-xl leading-10 text-landing-page-white">
              <li>
                This privacy policy applies to the personal information you provide when using this
                website (including the App, hereafter referred to as this website or &apos;we&apos).
                When you click on links provided by this website to access other websites,{' '}
                <span className="font-bold text-text-brand-primary-lv3">
                  the privacy policy of this website does not apply to those other websites.
                </span>
              </li>
            </ol>

            {/* Info: (20250219 - Julian) How might my personal information would be used */}
            <PrivacyPolicyDivider text={t('How might my personal information would be used')} />
            <ol className="flex list-decimal flex-col gap-80px text-xl leading-10 text-landing-page-white">
              {/* Info: (20250219 - Julian) 1. */}
              <li>
                To provide you with more accurate services or respond to your inquiries,{' '}
                <span className="font-bold text-text-brand-primary-lv3">
                  we may need you to provide personal
                </span>{' '}
                information under the following circumstances:
                <ul className="ml-5 list-outside list-image-blue-star indent-2 leading-44px marker:text-surface-support-strong-baby">
                  <li>
                    When you join as a customer of this website to receive our customer services.
                  </li>
                  <li>When you inquire about service information from this website.</li>
                  <li>When you request services from this website, whether paid or free.</li>
                </ul>
              </li>
              {/* Info: (20250219 - Julian) 2. */}
              <li>
                The primary purpose of collecting personal information is to enable this website to
                provide services to customers more accurately, meet customer needs, or notify
                customers about the latest products and services of this website. We may also use
                personal information for internal purposes, such as auditing, data analysis, and
                research to improve our products, services, web presentation, and communication with
                customers.{' '}
                <span className="font-bold text-text-brand-primary-lv3">
                  Without your consent, this website will not provide or disclose your personal
                  information to unrelated third parties, rent or resell it to any other party, or
                  use it for purposes not previously disclosed.
                </span>
              </li>
              {/* Info: (20250219 - Julian) 3. */}
              <li>
                information under the following circumstances: Except in the following
                circumstances, this website will not sell or disclose your personal information to
                any person or company without your consent:
                <ul className="ml-5 list-outside list-image-blue-star indent-2 leading-44px marker:text-surface-support-strong-baby">
                  <li>
                    When your actions on this website violate the terms of service or may harm or
                    hinder the rights of this website, or your actions have caused harm to others,
                    and it is necessary to identify, contact, or take legal action.
                  </li>
                  <li>
                    When the judicial authorities or other competent agencies require this website
                    to disclose specific personal information for public safety, and this website
                    must cooperate with the judicial authorities according to legal procedures.
                  </li>
                </ul>
              </li>
            </ol>

            {/* Info: (20250219 - Julian) How can I manage my personal information */}
            <PrivacyPolicyDivider text={t('How can I manage my personal informationy')} />
            <ol className="flex list-decimal flex-col gap-80px text-xl leading-10 text-landing-page-white">
              {/* Info: (20250219 - Julian) 1. */}
              <li>
                After registering as a customer on this website,{' '}
                <span className="font-bold text-text-brand-primary-lv3">
                  you can modify or delete the information{' '}
                </span>
                you initially provided at any time using your account and password to ensure its
                accuracy.
              </li>
              {/* Info: (20250219 - Julian) 2. */}
              <li>
                To protect your privacy and security, your account information is{' '}
                <span className="font-bold text-text-brand-primary-lv3">
                  protected by a password.
                </span>
              </li>
              {/* Info: (20250219 - Julian) 3. */}
              <li>
                When editing customer information or accessing personal data and privacy pages, this
                website{' '}
                <span className="font-bold text-text-brand-primary-lv3">
                  will require you to enter account identification information
                </span>{' '}
                to verify your identity.
              </li>
              {/* Info: (20250219 - Julian) 4. */}
              <li>
                To ensure the security of your account and personal information, in addition to
                promoting various security mechanisms, this website also recommends that you{' '}
                <span className="font-bold text-text-brand-primary-lv3">
                  regularly update your operating system and pay attention to antivirus measures.
                </span>
              </li>
              {/* Info: (20250219 - Julian) 5. */}
              <li>
                This website may modify this privacy policy at any time based on relevant legal
                requirements or actual circumstances to fulfill the legislative purpose of
                protecting privacy.{' '}
                <span className="font-bold text-text-brand-primary-lv3">
                  You should check the latest version regularly.
                </span>
              </li>
            </ol>

            {/* Info: (20250219 - Julian) What personal information would we collect */}
            <PrivacyPolicyDivider text={t('What personal information would we collect')} />
            <ol className="flex list-decimal flex-col gap-80px text-xl leading-10 text-landing-page-white">
              {/* Info: (20250219 - Julian) 1. */}
              <li>
                Categories of personal information: When using this website and related services, we
                will collect the following information based on your needs and the nature of the
                services (collectively referred to as personal information), including but not
                limited to the following legally specified categories of personal data:
                <div className="mt-40px grid grid-cols-2 gap-80px rounded-md border border-landing-page-white px-40px py-20px">
                  {/* Info: (20250219 - Julian) Left List */}
                  <ul className="ml-20px flex list-outside list-disc flex-col gap-40px">
                    <li>C001 Personal identifiers</li>
                    <li>C002 Financial identifiers</li>
                    <li>C003 Government data identifiers</li>
                    <li>C011 Personal descriptions</li>
                    <li>C021 Family situations</li>
                    <li>C023 Details of other family members</li>
                    <li>C031 Residential and facility details</li>
                    <li>C032 Property details</li>
                    <li>C037 Membership in charitable organizations or other groups</li>
                    <li>C038 Occupation</li>
                    <li>C053 Membership in professional associations</li>
                    <li>C061 Current employment status</li>
                    <li>C062 Employment history</li>
                    <li>C063 Separation history</li>
                    <li>C065 Work and attendance records</li>
                    <li>C068 Salary and withholdings</li>
                    <li>C070 Work management details</li>
                  </ul>
                  {/* Info: (20250219 - Julian) Right List */}
                  <ul className="ml-20px flex list-outside list-disc flex-col gap-40px">
                    <li>C081 Income, assets, and investments</li>
                    <li>C082 Liabilities and expenses</li>
                    <li>C083 Credit rating</li>
                    <li>C084 Loan records</li>
                    <li>C085 Foreign exchange transaction records</li>
                    <li>C086 Bill credit</li>
                    <li>C087 Allowances, benefits, and grants</li>
                    <li>C088 Insurance details</li>
                    <li>C089 Social insurance payments, pensions, and other retirement benefits</li>
                    <li>C091 Goods or services obtained by the data subject</li>
                    <li>C092 Goods or services provided by the data subject</li>
                    <li>C093 Financial transactions</li>
                    <li>C094 Compensation</li>
                    <li>C101 Commercial activities of the data subject</li>
                    <li>C102 Contracts or agreements, etc.</li>
                  </ul>
                </div>
              </li>
              {/* Info: (20250219 - Julian) 2. */}
              <li>
                Categories of personal information: When using this website and related services, we
                will collect the following information based on your needs and the nature of the
                services (collectively referred to as personal information), including but not
                limited to the following legally specified categories of personal data:
                <div className="mt-40px grid grid-cols-2 gap-80px rounded-md border border-landing-page-white px-40px py-20px">
                  {/* Info: (20250219 - Julian) Left List */}
                  <ul className="ml-20px flex list-outside list-disc flex-col gap-40px">
                    <li>C001 Personal identifiers</li>
                    <li>C002 Financial identifiers</li>
                    <li>C003 Government data identifiers</li>
                    <li>C011 Personal descriptions</li>
                    <li>C021 Family situations</li>
                    <li>C023 Details of other family members</li>
                    <li>C031 Residential and facility details</li>
                    <li>C032 Property details</li>
                    <li>C037 Membership in charitable organizations or other groups</li>
                    <li>C038 Occupation</li>
                    <li>C053 Membership in professional associations</li>
                    <li>C061 Current employment status</li>
                    <li>C062 Employment history</li>
                    <li>C063 Separation history</li>
                    <li>C065 Work and attendance records</li>
                    <li>C068 Salary and withholdings</li>
                    <li>C070 Work management details</li>
                  </ul>
                  {/* Info: (20250219 - Julian) Right List */}
                  <ul className="ml-20px flex list-outside list-disc flex-col gap-40px">
                    <li>C081 Income, assets, and investments</li>
                    <li>C082 Liabilities and expenses</li>
                    <li>C083 Credit rating</li>
                    <li>C084 Loan records</li>
                    <li>C085 Foreign exchange transaction records</li>
                    <li>C086 Bill credit</li>
                    <li>C087 Allowances, benefits, and grants</li>
                    <li>C088 Insurance details</li>
                    <li>C089 Social insurance payments, pensions, and other retirement benefits</li>
                    <li>C091 Goods or services obtained by the data subject</li>
                    <li>C092 Goods or services provided by the data subject</li>
                    <li>C093 Financial transactions</li>
                    <li>C094 Compensation</li>
                    <li>C101 Commercial activities of the data subject</li>
                    <li>C102 Contracts or agreements, etc.</li>
                  </ul>
                </div>
              </li>
            </ol>
          </div>
        </div>

        {/* Info: (20250219 - Julian) Footer */}
        <LandingFooter />
        <ScrollToTopButton />
      </main>
    </div>
  );
};

export default PrivacyPolicyPageBody;
