import Link from 'next/link';
import Image from 'next/image';
import DashboardCardLayout from '@/components/beta/dashboard/dashboard_card_layout';
import MoreLink from '@/components/beta/dashboard/more_link';
import { ICompany } from '@/interfaces/company';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useTranslation } from 'next-i18next';

// ToDo: (20241016 - Liz) 從 user context 中打 API 取得公司列表、判斷是否為空
const COMPANY_LIST: ICompany[] = [
  {
    id: 1,
    imageId: '/images/fake_company_log_01.png',
    name: 'Company A',
    taxId: '1234567890',
    tag: 'A',
    startDate: 1626355200000,
    createdAt: 1626355200000,
    updatedAt: 1626355200000,
  },
  {
    id: 2,
    imageId: '/images/fake_company_log_02.png',
    name: 'Company B',
    taxId: '0987654321',
    tag: 'B',
    startDate: 1626355200000,
    createdAt: 1626355200000,
    updatedAt: 1626355200000,
  },
  {
    id: 3,
    imageId: '/images/fake_company_log_03.png',
    name: 'Company C',
    taxId: '1357924680',
    tag: 'C',
    startDate: 1626355200000,
    createdAt: 1626355200000,
    updatedAt: 1626355200000,
  },
];

const isCompanyListEmpty = COMPANY_LIST.length === 0;

const EmptyCompanyList = () => {
  const { t } = useTranslation('common');

  return (
    <div className="flex flex-col items-center justify-center py-26px">
      <p className="text-base text-text-neutral-mute">
        {t('common:BETA_DASHBOARD.COMPANY_NOT_YET_CREATED')}
      </p>
      <p className="text-base text-text-neutral-mute">
        {t('common:BETA_DASHBOARD.PLEASE_PROCEED_TO')}{' '}
        <Link href={'/'} className="text-text-neutral-link underline underline-offset-4">
          {t('common:BETA_DASHBOARD.CREATE_A_COMPANY')}
        </Link>
      </p>
    </div>
  );
};

const CompanyList = () => {
  const handleSelectCompany = () => {
    // ToDo: (20241016 - Liz) 改變 user context 選擇公司的狀態，根據所選擇的公司顯示不同的資訊

    // Deprecated: (20241016 - Liz)
    // eslint-disable-next-line no-console
    console.log('Selected a company');
  };

  return (
    <div className="flex justify-center gap-40px">
      {COMPANY_LIST.map((company) => (
        <button
          type="button"
          onClick={handleSelectCompany}
          className="h-100px w-100px overflow-hidden rounded-sm bg-surface-neutral-surface-lv2 shadow-Dropshadow_XS"
        >
          <Image src={company.imageId} alt={company.name} width={100} height={100}></Image>
        </button>
      ))}
    </div>
  );
};

const MyCompanyList = () => {
  const { t } = useTranslation('common');

  return (
    <DashboardCardLayout>
      <section className="flex flex-col gap-32px">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-text-neutral-secondary">
            {t('common:BETA_DASHBOARD.MY_COMPANY_LIST')}
          </h3>

          <MoreLink href={ISUNFA_ROUTE.MY_COMPANY_LIST_PAGE} />
        </div>

        {isCompanyListEmpty ? <EmptyCompanyList /> : <CompanyList />}
      </section>
    </DashboardCardLayout>
  );
};

export default MyCompanyList;
