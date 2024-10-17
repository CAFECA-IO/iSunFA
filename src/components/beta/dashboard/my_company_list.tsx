import Link from 'next/link';
import Image from 'next/image';
import DashboardCardLayout, { MoreLink } from '@/components/beta/dashboard/dashboard_card_layout';
import { ICompany } from '@/interfaces/company';

// ToDo: (20241016 - Liz) 從 user context 中打 API 取得公司列表、判斷是否為空
const isCompanyListEmpty = false;

const companyList: ICompany[] = [
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

const EmptyCompanyList = () => {
  return (
    <div className="flex flex-col items-center justify-center py-26px">
      <p className="text-base text-text-neutral-mute">Company not yet created.</p>
      <p className="text-base text-text-neutral-mute">
        Please proceed to{' '}
        <Link href={'/'} className="text-text-neutral-link underline underline-offset-4">
          create a company
        </Link>
        .
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
      {companyList.map((company) => (
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
  return (
    <DashboardCardLayout>
      <section className="flex flex-col gap-32px">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-text-neutral-secondary">My Company List</h3>

          <MoreLink href="/" />
        </div>

        {isCompanyListEmpty ? <EmptyCompanyList /> : <CompanyList />}
      </section>
    </DashboardCardLayout>
  );
};

export default MyCompanyList;
