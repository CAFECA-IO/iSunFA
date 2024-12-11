import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';
import { IoHomeOutline } from 'react-icons/io5';
import { IoIosArrowForward } from 'react-icons/io';

const Breadcrumb = () => {
  const { t } = useTranslation(['landing_page']);

  return (
    <div className="flex items-center">
      <Link
        href={ISUNFA_ROUTE.LANDING_PAGE}
        className="flex items-center gap-8px px-12px py-10px hover:text-input-text-highlight"
      >
        <IoHomeOutline size={20} />
        <p>{t('landing_page:LANDING_FOOTER.HOME')}</p>
        <IoIosArrowForward size={20} />
      </Link>

      <h5 className="text-input-text-highlight">
        {t('landing_page:LANDING_FOOTER.TERMS_OF_SERVICE')}
      </h5>
    </div>
  );
};

const TermsOfServicePageBody = () => {
  const { t } = useTranslation(['landing_page', 'terms']);

  return (
    <div>
      <Breadcrumb />

      <main className="mb-240px mt-120px flex flex-col gap-20px px-160px text-lg font-semibold">
        <h1 className="mb-20px text-44px font-bold text-text-brand-primary-lv3">
          {t('landing_page:LANDING_FOOTER.TERMS_OF_SERVICE')}
        </h1>

        <p>{t('terms:TERMS_OF_SERVICE_FOR_LANDING_PAGE.TEXT_01')}</p>
        <p>{t('terms:TERMS_OF_SERVICE_FOR_LANDING_PAGE.TEXT_02')}</p>
        <p>{t('terms:TERMS_OF_SERVICE_FOR_LANDING_PAGE.TEXT_03')}</p>
        <p>{t('terms:TERMS_OF_SERVICE_FOR_LANDING_PAGE.TEXT_04')}</p>
        <p>{t('terms:TERMS_OF_SERVICE_FOR_LANDING_PAGE.TEXT_05')}</p>
        <p>{t('terms:TERMS_OF_SERVICE_FOR_LANDING_PAGE.TEXT_06')}</p>
        <p>{t('terms:TERMS_OF_SERVICE_FOR_LANDING_PAGE.TEXT_07')}</p>
        <p>{t('terms:TERMS_OF_SERVICE_FOR_LANDING_PAGE.TEXT_08')}</p>
        <p>{t('terms:TERMS_OF_SERVICE_FOR_LANDING_PAGE.TEXT_09')}</p>
        <p>{t('terms:TERMS_OF_SERVICE_FOR_LANDING_PAGE.TEXT_10')}</p>
        <p>{t('terms:TERMS_OF_SERVICE_FOR_LANDING_PAGE.TEXT_11')}</p>
        <p>{t('terms:TERMS_OF_SERVICE_FOR_LANDING_PAGE.TEXT_12')}</p>
        <p>{t('terms:TERMS_OF_SERVICE_FOR_LANDING_PAGE.TEXT_13')}</p>
        <p>{t('terms:TERMS_OF_SERVICE_FOR_LANDING_PAGE.TEXT_14')}</p>
        <p>
          {t('terms:TERMS_OF_SERVICE_FOR_LANDING_PAGE.TEXT_15')}
          <ul className="list-inside list-disc indent-6">
            <li>{t('terms:TERMS_OF_SERVICE_FOR_LANDING_PAGE.TEXT_15_01')}</li>
            <li>{t('terms:TERMS_OF_SERVICE_FOR_LANDING_PAGE.TEXT_15_02')}</li>
          </ul>
        </p>
      </main>
    </div>
  );
};

export default TermsOfServicePageBody;
