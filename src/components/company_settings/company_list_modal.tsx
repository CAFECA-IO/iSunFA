import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import Pagination from '@/components/pagination/pagination';
import { ICompanySettingList } from '@/interfaces/company_setting';
import { APIName } from '@/constants/api_connection';
import { IPaginatedData } from '@/interfaces/pagination';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import FilterSection from '@/components/filter_section/filter_section';
import Image from 'next/image';
import { IoCloseOutline } from 'react-icons/io5';
import { CompanyTag } from '@/constants/company';
import SortingButton from '@/components/voucher/sorting_button';
import { SortOrder } from '@/constants/sort';
import WorkTag from '@/components/company_settings/work_tag';

interface CompanyListModalProps {
  toggleModal: () => void;
}

const dummyCompanies: ICompanySettingList[] = [
  {
    id: 1,
    partnerName: 'Company 1',
    taxId: '12345678',
    type: CompanyTag.FINANCIAL,
  },
  {
    id: 2,
    partnerName: 'Company 2',
    taxId: '87654321',
    type: CompanyTag.TAX,
  },
  {
    id: 3,
    partnerName: 'Company 3',
    taxId: '12348765',
    type: CompanyTag.ALL,
  },
  {
    id: 4,
    partnerName: 'Company 4',
    taxId: '87651234',
    type: CompanyTag.FINANCIAL,
  },
  {
    id: 5,
    partnerName: 'Company 5',
    taxId: '12345678',
    type: CompanyTag.TAX,
  },
  {
    id: 6,
    partnerName: 'Company 6',
    taxId: '87654321',
    type: CompanyTag.ALL,
  },
  {
    id: 7,
    partnerName: 'Company 7',
    taxId: '12348765',
    type: CompanyTag.FINANCIAL,
  },
  {
    id: 8,
    partnerName: 'Company 8',
    taxId: '87651234',
    type: CompanyTag.TAX,
  },
  {
    id: 9,
    partnerName: 'Company 9',
    taxId: '12345678',
    type: CompanyTag.ALL,
  },
  {
    id: 10,
    partnerName: 'Company 10',
    taxId: '87654321',
    type: CompanyTag.FINANCIAL,
  },
];

const CompanyListModal: React.FC<CompanyListModalProps> = ({ toggleModal }) => {
  const { t } = useTranslation(['setting', 'common', 'company']);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(dummyCompanies.length);
  const [totalPages, setTotalPages] = useState(1);
  const [companies, setCompanies] = useState<ICompanySettingList[]>(dummyCompanies);
  const [typeSort, setTypeSort] = useState<null | SortOrder>(null);

  const displayedType = SortingButton({
    string: t('company:LIST.TYPE'),
    sortOrder: typeSort,
    setSortOrder: setTypeSort,
  });

  const handleApiResponse = (data: IPaginatedData<ICompanySettingList[]>) => {
    setTotalCount(data.totalCount);
    setTotalPages(data.totalPages);
    setCompanies(data.data); // Deprecated: (20241122 - tzuhan) Use dummy data instead
  };

  return (
    <main className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="ml-250px flex max-h-90vh w-90vw max-w-920px flex-col gap-lv-5 overflow-y-hidden rounded-lg bg-surface-neutral-surface-lv2 p-lv-7">
        <section className="flex items-center justify-between">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-secondary">
            {t('company:LIST.TITLE')}
          </h1>
          <button type="button" onClick={toggleModal}>
            <IoCloseOutline size={24} />
          </button>
        </section>
        <section className="flex flex-col gap-lv-5">
          <FilterSection<ICompanySettingList[]>
            className="mt-2"
            params={{}}
            apiName={APIName.COMPANY_LIST}
            onApiResponse={handleApiResponse}
            page={page}
            pageSize={DEFAULT_PAGE_LIMIT}
            diseableDateSearch
          />
          <div id="company-setting-list" className="flex items-center gap-4">
            <hr className="block flex-1 border-divider-stroke-lv-4 md:hidden" />
            <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
              <Image
                src="/icons/asset_management_icon.svg"
                width={16}
                height={16}
                alt="company_icon"
              />
              <p>{t('company:LIST.TITLE')}</p>
            </div>
            <hr className="flex-1 border-divider-stroke-lv-4" />
          </div>
          <div className="max-h-46vh overflow-y-auto rounded-sm bg-surface-neutral-surface-lv2 shadow-normal_setting_brand">
            <div className="table">
              <div className="table-header-group h-60px w-full rounded-sm bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
                <div className="table-row w-full">
                  <div className="table-cell min-w-134px border-b border-r border-stroke-neutral-quaternary p-2 text-center align-middle">
                    <div>{t('company:LIST.PARTNER_NAME')}</div>
                  </div>
                  <div className="table-cell min-w-84px border-b border-r border-stroke-neutral-quaternary p-2 text-center align-middle">
                    <div>{t('company:LIST.TAX_ID')}</div>
                  </div>
                  <div className="table-cell w-full border-b border-r"></div>
                  <div className="table-cell min-w-105px border-b border-r border-stroke-neutral-quaternary p-2 text-center align-middle">
                    {displayedType}
                  </div>
                  <div className="table-cell min-w-64px border-b border-stroke-neutral-quaternary p-2 text-center align-middle">
                    <div>{t('company:LIST.ACTION')}</div>
                  </div>
                </div>
              </div>
              <div className="table-row-group">
                {companies.map((company, index) => (
                  <div
                    className="group table-row h-72px text-sm text-text-neutral-primary hover:bg-surface-brand-primary-10"
                    key={`${company.taxId}-${index + 1}`}
                  >
                    <div className="relative table-cell text-center align-middle">
                      <div className="text-text-neutral-primary">{company.partnerName}</div>
                    </div>
                    <div className="relative table-cell text-center align-middle">
                      <div className="text-text-neutral-tertiary">{company.taxId}</div>
                    </div>
                    <div className="relative table-cell"></div>
                    <div className="relative table-cell justify-center align-middle">
                      <WorkTag type={company.type} />
                    </div>
                    <div className="relative table-cell justify-center align-middle">
                      <Image
                        alt="edit"
                        src="/elements/edit.svg"
                        width={20}
                        height={20}
                        className="mx-auto block cursor-pointer"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Pagination
              currentPage={page}
              setCurrentPage={setPage}
              totalCount={totalCount}
              totalPages={totalPages}
            />
          </div>
        </section>
      </div>
    </main>
  );
};

export default CompanyListModal;
