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
import WorkTag from '@/components/general/account_book_settings/work_tag';
import AccountBookInfoModal from '@/components/beta/account_books_page/account_book_info_modal';
import { useUserCtx } from '@/contexts/user_context';
import { SortBy, SortOrder } from '@/constants/sort';

interface AccountBookListModalProps {
  closeToggleAccountBookListModal: () => void;
}

const AccountBookListModal = ({ closeToggleAccountBookListModal }: AccountBookListModalProps) => {
  const { t } = useTranslation(['settings', 'account_book']);
  const { userAuth } = useUserCtx();

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [accountBookList, setAccountBookList] = useState<IAccountBookWithTeam[]>([]);
  const [typeSort, setTypeSort] = useState<null | SortOrder>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0); // Info: (20250415 - Liz) This is a workaround to refresh the FilterSection component to retrigger the API call. This is not the best solution.

  const [isAccountBookListModalOpen, setIsAccountBookListModalOpen] = useState(false);
  const [accountBookToEdit, setAccountBookToEdit] = useState<IAccountBookWithTeam | undefined>();

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
    setAccountBookToEdit(accountBook);
    setIsAccountBookListModalOpen(true);
  };

  const closeAccountBookInfoModal = () => {
    setIsAccountBookListModalOpen(false);
    setAccountBookToEdit(undefined);
  };

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      {isAccountBookListModalOpen && accountBookToEdit && (
        <AccountBookInfoModal
          accountBookToEdit={accountBookToEdit}
          closeAccountBookInfoModal={closeAccountBookInfoModal}
          setRefreshKey={setRefreshKey}
        />
      )}
      <div className="flex max-h-90vh w-90vw max-w-920px flex-col gap-lv-5 overflow-y-hidden rounded-lg bg-surface-neutral-surface-lv2 px-20px py-16px tablet:p-lv-7">
        <section className="relative flex items-center justify-center">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-primary">
            {t('account_book:LIST.ACCOUNT_BOOK_LIST_TITLE')}
          </h1>
          <button
            type="button"
            onClick={closeToggleAccountBookListModal}
            className="absolute right-0 text-icon-surface-single-color-primary"
          >
            <IoCloseOutline size={24} />
          </button>
        </section>

        <section className="flex flex-col gap-lv-5">
          <FilterSection<IAccountBookWithTeam[]>
            key={refreshKey}
            className="mt-2"
            apiName={APIName.LIST_ACCOUNT_BOOK_BY_USER_ID}
            params={{ userId: userAuth?.id }}
            onApiResponse={handleApiResponse}
            page={page}
            pageSize={DEFAULT_PAGE_LIMIT}
            disableDateSearch
            // sort={{ by: SortBy.TAG, order: typeSort ?? SortOrder.DESC }} // ToDo: (20250506 - Liz) 工作標籤排序功能尚未實作
            sort={{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }}
          />

          <div className="flex items-center gap-lv-4">
            <div className="flex items-center gap-lv-2 text-sm font-medium text-divider-text-lv-2">
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

          <section className="max-h-46vh overflow-y-auto rounded-md border border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2">
            <div className="table">
              {/* Info: (20250506 - Liz) Table Header */}
              <div className="sticky top-0 z-10 table-header-group h-60px w-full rounded-md bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
                <div className="table-row w-full divide-x divide-stroke-neutral-quaternary">
                  <div className="table-cell min-w-134px border-b border-stroke-neutral-quaternary p-2 text-center align-middle">
                    <div>{t('account_book:INFO.COMPANY_NAME')}</div>
                  </div>
                  <div className="table-cell min-w-84px whitespace-nowrap border-b border-stroke-neutral-quaternary p-2 text-center align-middle">
                    <div>{t('account_book:INFO.TAX_ID')}</div>
                  </div>
                  <div className="table-cell w-full border-b border-stroke-neutral-quaternary"></div>
                  <div className="table-cell min-w-105px border-b border-stroke-neutral-quaternary p-2 text-center align-middle">
                    {displayedType}
                  </div>
                  <div className="table-cell min-w-64px border-b border-stroke-neutral-quaternary p-2 text-center align-middle">
                    <div>{t('account_book:LIST.ACTION')}</div>
                  </div>
                </div>
              </div>

              {/* Info: (20250506 - Liz) Table Body */}
              <div className="table-row-group">
                {accountBookList.map((accountBook, index) => (
                  <div
                    className="group table-row h-72px text-sm text-text-neutral-primary hover:bg-surface-brand-primary-10"
                    key={`${accountBook.taxId}-${index + 1}`}
                  >
                    <div className="table-cell text-center align-middle">
                      <div className="text-text-neutral-primary">{accountBook.name}</div>
                    </div>
                    <div className="table-cell text-center align-middle">
                      <div className="text-text-neutral-tertiary">{accountBook.taxId}</div>
                    </div>
                    <div className="table-cell"></div>
                    <div className="table-cell justify-center align-middle">
                      <WorkTag type={accountBook.tag} />
                    </div>
                    <div
                      className="table-cell justify-center align-middle"
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
          </section>

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
