import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import Pagination from '@/components/pagination/pagination';
import { ICompanyAndRole } from '@/interfaces/company';
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
import CompanyEditModal from '@/components/company_settings/company_edit_modal';
import { useUserCtx } from '@/contexts/user_context';

interface CompanyListModalProps {
  toggleModal: () => void;
}

const dummyCompanies: ICompanyAndRole[] = [
  {
    company: {
      id: 1,
      imageId: 'img123',
      name: 'Tech Corp',
      taxId: '123456789',
      startDate: 1622505600,
      createdAt: 1622505600,
      updatedAt: 1622505600,
    },
    tag: CompanyTag.ALL,
    order: 1,
    role: {
      id: 1,
      name: 'Admin',
      permissions: ['read', 'write', 'delete'],
      createdAt: 1622505600,
      updatedAt: 1622505600,
    },
  },
  {
    company: {
      id: 2,
      imageId: 'img456',
      name: 'Tech Corp 2',
      taxId: '987654321',
      startDate: 1622505600,
      createdAt: 1622505600,
      updatedAt: 1622505600,
    },
    tag: CompanyTag.ALL,
    order: 2,
    role: {
      id: 2,
      name: 'Admin',
      permissions: ['read', 'write', 'delete'],
      createdAt: 1622505600,
      updatedAt: 1622505600,
    },
  },
  {
    company: {
      id: 3,
      imageId: 'img456',
      name: 'Tech Corp 3',
      taxId: '987654321',
      startDate: 1622505600,
      createdAt: 1622505600,
      updatedAt: 1622505600,
    },
    tag: CompanyTag.ALL,
    order: 3,
    role: {
      id: 3,
      name: 'Admin',
      permissions: ['read', 'write', 'delete'],
      createdAt: 1622505600,
      updatedAt: 1622505600,
    },
  },
  {
    company: {
      id: 4,
      imageId: 'img456',
      name: 'Tech Corp 4',
      taxId: '987654321',
      startDate: 1622505600,
      createdAt: 1622505600,
      updatedAt: 1622505600,
    },
    tag: CompanyTag.TAX,
    order: 4,
    role: {
      id: 4,
      name: 'Admin',
      permissions: ['read', 'write', 'delete'],
      createdAt: 1622505600,
      updatedAt: 1622505600,
    },
  },
  {
    company: {
      id: 5,
      imageId: 'img456',
      name: 'Tech Corp 5',
      taxId: '987654321',
      startDate: 1622505600,
      createdAt: 1622505600,
      updatedAt: 1622505600,
    },
    tag: CompanyTag.FINANCIAL,
    order: 5,
    role: {
      id: 5,
      name: 'Admin',
      permissions: ['read', 'write', 'delete'],
      createdAt: 1622505600,
      updatedAt: 1622505600,
    },
  },
];

const CompanyListModal: React.FC<CompanyListModalProps> = ({ toggleModal }) => {
  const { t } = useTranslation(['setting', 'common', 'company']);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(dummyCompanies.length); // ToDo: (20241107 - Tzuhan) - Replace with real data
  const [totalPages, setTotalPages] = useState(1);
  const [companies, setCompanies] = useState<ICompanyAndRole[]>(dummyCompanies);
  const [typeSort, setTypeSort] = useState<null | SortOrder>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<ICompanyAndRole | null>(null);
  const { userAuth } = useUserCtx();

  const displayedType = SortingButton({
    string: t('company:INFO.WORK_TAG'),
    sortOrder: typeSort,
    setSortOrder: setTypeSort,
  });

  const handleApiResponse = (data: IPaginatedData<ICompanyAndRole[]>) => {
    setTotalCount(data.totalCount);
    setTotalPages(data.totalPages);
    setCompanies(data.data);
  };

  const handleEditModal = (company: ICompanyAndRole) => {
    setSelectedCompany(company);
    setIsEditModalOpen(true);
  };

  return (
    <main className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      {isEditModalOpen && selectedCompany && (
        <CompanyEditModal
          company={selectedCompany}
          toggleModal={() => setIsEditModalOpen((prev) => !prev)}
        />
      )}
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
          <FilterSection<ICompanyAndRole[]>
            className="mt-2"
            apiName={APIName.LIST_USER_COMPANY}
            params={{ userId: userAuth?.id }}
            onApiResponse={handleApiResponse}
            page={page}
            pageSize={DEFAULT_PAGE_LIMIT}
            disableDateSearch
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
                    <div>{t('company:INFO.NAME')}</div>
                  </div>
                  <div className="table-cell min-w-84px border-b border-r border-stroke-neutral-quaternary p-2 text-center align-middle">
                    <div>{t('company:INFO.TAX_ID')}</div>
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
                    key={`${company.company.taxId}-${index + 1}`}
                  >
                    <div className="relative table-cell text-center align-middle">
                      <div className="text-text-neutral-primary">{company.company.name}</div>
                    </div>
                    <div className="relative table-cell text-center align-middle">
                      <div className="text-text-neutral-tertiary">{company.company.taxId}</div>
                    </div>
                    <div className="relative table-cell"></div>
                    <div className="relative table-cell justify-center align-middle">
                      <WorkTag type={company.tag} />
                    </div>
                    <div
                      className="relative table-cell justify-center align-middle"
                      onClick={handleEditModal.bind(null, company)}
                    >
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
