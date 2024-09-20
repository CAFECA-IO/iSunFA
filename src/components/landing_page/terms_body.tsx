import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';
import { IoHomeOutline } from 'react-icons/io5';
import { IoIosArrowForward } from 'react-icons/io';

const Breadcrumb = () => {
  const { t } = useTranslation(['common']);

  return (
    <div className="flex items-center">
      <Link
        href={ISUNFA_ROUTE.LANDING_PAGE}
        className="flex items-center gap-8px px-12px py-10px hover:text-input-text-highlight"
      >
        <IoHomeOutline size={20} />
        <p>{t('common:LANDING_FOOTER.HOME')}</p>
        <IoIosArrowForward size={20} />
      </Link>

      <h5 className="text-input-text-highlight">{t('common:LANDING_FOOTER.TERMS_OF_SERVICE')}</h5>
    </div>
  );
};

const TermsOfServicePageBody = () => {
  const { t } = useTranslation(['common', 'terms']);

  return (
    <div>
      <Breadcrumb />

      <main className="mb-240px mt-120px flex flex-col gap-20px px-160px text-lg font-semibold">
        <h1 className="mb-20px text-44px font-bold text-text-brand-primary-lv3">
          {t('common:LANDING_FOOTER.TERMS_OF_SERVICE')}
        </h1>

        <p>{t('terms:TERMS_OF_SERVICE.TEXT_01')}</p>
        <p>{t('terms:TERMS_OF_SERVICE.TEXT_02')}</p>
        <p>{t('terms:TERMS_OF_SERVICE.TEXT_03')}</p>
        <p>{t('terms:TERMS_OF_SERVICE.TEXT_04')}</p>
        <p>{t('terms:TERMS_OF_SERVICE.TEXT_05')}</p>
        <p>{t('terms:TERMS_OF_SERVICE.TEXT_06')}</p>
        <p>{t('terms:TERMS_OF_SERVICE.TEXT_07')}</p>
        <p>{t('terms:TERMS_OF_SERVICE.TEXT_08')}</p>
        <p>{t('terms:TERMS_OF_SERVICE.TEXT_09')}</p>
        <p>{t('terms:TERMS_OF_SERVICE.TEXT_10')}</p>
        <p>{t('terms:TERMS_OF_SERVICE.TEXT_11')}</p>
        <p>{t('terms:TERMS_OF_SERVICE.TEXT_12')}</p>
        <p>{t('terms:TERMS_OF_SERVICE.TEXT_13')}</p>
        <p>{t('terms:TERMS_OF_SERVICE.TEXT_14')}</p>
        <p>
          {t('terms:TERMS_OF_SERVICE.TEXT_15')}
          <ul className="list-inside list-disc indent-6">
            <li>{t('terms:TERMS_OF_SERVICE.TEXT_15_01')}</li>
            <li>{t('terms:TERMS_OF_SERVICE.TEXT_15_02')}</li>
          </ul>
        </p>
      </main>
    </div>
  );
};

export default TermsOfServicePageBody;
