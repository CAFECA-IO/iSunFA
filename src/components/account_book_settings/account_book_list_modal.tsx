import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import Pagination from '@/components/pagination/pagination';
import { IAccountBookWithTeam } from '@/interfaces/account_book';
import { APIName } from '@/constants/api_connection';
import { IPaginatedData } from '@/interfaces/pagination';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import FilterSection from '@/components/filter_section/filter_section';
import Image from 'next/image';
import { IoCloseOutline } from 'react-icons/io5';
import SortingButton from '@/components/voucher/sorting_button';
import WorkTag from '@/components/account_book_settings/work_tag';
import AccountBookEditModal from '@/components/account_book_settings/account_book_edit_modal';
import { useUserCtx } from '@/contexts/user_context';
import { SortBy, SortOrder } from '@/constants/sort';

interface AccountBookListModalProps {
  toggleModal: () => void;
}

const AccountBookListModal: React.FC<AccountBookListModalProps> = ({ toggleModal }) => {
  const { t } = useTranslation(['settings', 'common', 'account_book']);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [accountBookList, setAccountBookList] = useState<IAccountBookWithTeam[]>([]);
  const [typeSort, setTypeSort] = useState<null | SortOrder>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAccountBook, setSelectedAccountBook] = useState<IAccountBookWithTeam | null>(null);
  const { userAuth } = useUserCtx();

  // ToDo: (20250328 - Liz) 根據工作標籤排序功能尚未實作
  const displayedType = SortingButton({
    string: t('account_book:INFO.WORK_TAG'),
    sortOrder: typeSort,
    setSortOrder: setTypeSort,
  });

  const handleApiResponse = (data: IPaginatedData<IAccountBookWithTeam[]>) => {
    setTotalCount(data.totalCount);
    setTotalPages(data.totalPages);
    setAccountBookList(data.data);
  };

  const handleEditModal = (accountBook: IAccountBookWithTeam) => {
    setSelectedAccountBook(accountBook);
    setIsEditModalOpen(true);
  };

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      {isEditModalOpen && selectedAccountBook && (
        <AccountBookEditModal
          accountBook={selectedAccountBook}
          toggleModal={() => setIsEditModalOpen((prev) => !prev)}
        />
      )}
      <div className="flex max-h-90vh w-90vw max-w-920px flex-col gap-lv-5 overflow-y-hidden rounded-lg bg-surface-neutral-surface-lv2 p-lv-7">
        <section className="flex items-center justify-between">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-secondary">
            {t('account_book:LIST.ACCOUNT_BOOK_LIST_TITLE')}
          </h1>
          <button type="button" onClick={toggleModal}>
            <IoCloseOutline size={24} />
          </button>
        </section>
        <section className="flex flex-col gap-lv-5">
          <FilterSection<IAccountBookWithTeam[]>
            className="mt-2"
            apiName={APIName.LIST_ACCOUNT_BOOK_BY_USER_ID}
            params={{ userId: userAuth?.id }}
            onApiResponse={handleApiResponse}
            page={page}
            pageSize={DEFAULT_PAGE_LIMIT}
            disableDateSearch
            sort={{ by: SortBy.CREATED_AT, order: SortOrder.DESC }}
          />
          <div id="company-settings-list" className="flex items-center gap-4">
            <hr className="block flex-1 border-divider-stroke-lv-4 md:hidden" />
            <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
              <Image
                src="/icons/asset_management_icon.svg"
                width={16}
                height={16}
                alt="company_icon"
              />
              <p>{t('account_book:LIST.ACCOUNT_BOOK_LIST_TITLE')}</p>
            </div>
            <hr className="flex-1 border-divider-stroke-lv-4" />
          </div>
          <div className="max-h-46vh overflow-y-auto rounded-sm bg-surface-neutral-surface-lv2 shadow-normal_setting_brand">
            <div className="table">
              <div className="table-header-group h-60px w-full rounded-sm bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
                <div className="table-row w-full">
                  <div className="table-cell min-w-134px border-b border-r border-stroke-neutral-quaternary p-2 text-center align-middle">
                    <div>{t('account_book:INFO.COMPANY_NAME')}</div>
                  </div>
                  <div className="table-cell min-w-84px border-b border-r border-stroke-neutral-quaternary p-2 text-center align-middle">
                    <div>{t('account_book:INFO.TAX_ID')}</div>
                  </div>
                  <div className="table-cell w-full border-b border-r"></div>
                  <div className="table-cell min-w-105px border-b border-r border-stroke-neutral-quaternary p-2 text-center align-middle">
                    {displayedType}
                  </div>
                  <div className="table-cell min-w-64px border-b border-stroke-neutral-quaternary p-2 text-center align-middle">
                    <div>{t('account_book:LIST.ACTION')}</div>
                  </div>
                </div>
              </div>
              <div className="table-row-group">
                {accountBookList.map((accountBook, index) => (
                  <div
                    className="group table-row h-72px text-sm text-text-neutral-primary hover:bg-surface-brand-primary-10"
                    key={`${accountBook.taxId}-${index + 1}`}
                  >
                    <div className="relative table-cell text-center align-middle">
                      <div className="text-text-neutral-primary">{accountBook.name}</div>
                    </div>
                    <div className="relative table-cell text-center align-middle">
                      <div className="text-text-neutral-tertiary">{accountBook.taxId}</div>
                    </div>
                    <div className="relative table-cell"></div>
                    <div className="relative table-cell justify-center align-middle">
                      <WorkTag type={accountBook.tag} />
                    </div>
                    <div
                      className="relative table-cell justify-center align-middle"
                      onClick={() => handleEditModal(accountBook)}
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

export default AccountBookListModal;
