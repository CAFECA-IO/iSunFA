import { useState } from 'react';
import { BsEnvelope, BsPlusLg } from 'react-icons/bs';
import { IPaginatedData } from '@/interfaces/pagination';
import { IAccountBookWithTeam } from '@/interfaces/account_book';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { APIName } from '@/constants/api_connection';
import { DEFAULT_PAGE_LIMIT_FOR_ACCOUNT_BOOK_LIST } from '@/constants/config';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import Pagination from '@/components/pagination/pagination';
import MessageModal from '@/components/message_modal/message_modal';
import FilterSection from '@/components/filter_section/filter_section';
import NoData from '@/components/beta/account_books_page/no_data';
import AccountBookInfoModal from '@/components/beta/account_books_page/account_book_info_modal';
import ChangeTagModal from '@/components/beta/account_books_page/change_tag_modal';
import AccountBookList from '@/components/beta/account_books_page/account_book_list';
import TransferAccountBookModal from '@/components/beta/account_books_page/transfer_account_book_modal';
import { SortBy, SortOrder } from '@/constants/sort';
import loggerFront from '@/lib/utils/logger_front';

const AccountBooksPageBody = () => {
  const { t } = useTranslation(['account_book']);
  const { userAuth, deleteAccountBook } = useUserCtx();
  const userId = userAuth?.id;

  const [refreshKey, setRefreshKey] = useState<number>(0); // Info: (20241114 - Liz) This is a workaround to refresh the FilterSection component to retrigger the API call. This is not the best solution.

  const [isCreateAccountBookModalOpen, setIsCreateAccountBookModalOpen] = useState<boolean>(false);
  const [accountBookToEdit, setAccountBookToEdit] = useState<IAccountBookWithTeam | undefined>();
  const [accountBookToTransfer, setAccountBookToTransfer] = useState<
    IAccountBookWithTeam | undefined
  >();
  const [accountBookToChangeTag, setAccountBookToChangeTag] = useState<
    IAccountBookWithTeam | undefined
  >();
  const [accountBookToDelete, setAccountBookToDelete] = useState<
    IAccountBookWithTeam | undefined
  >();

  const [totalPage, setTotalPage] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [accountBookList, setAccountBookList] = useState<IAccountBookWithTeam[]>([]);

  const isNoData = accountBookList.length === 0;

  const openCreateAccountBookModal = () => setIsCreateAccountBookModalOpen(true);
  const closeCreateAccountBookModal = () => setIsCreateAccountBookModalOpen(false);
  const closeEditAccountBookModal = () => setAccountBookToEdit(undefined);
  const closeDeleteModal = () => setAccountBookToDelete(undefined);

  // Info: (20241115 - Liz) 打 API 刪除帳本(原為公司)
  const handleDeleteAccountBook = async () => {
    if (!accountBookToDelete) return;

    try {
      const success = await deleteAccountBook(accountBookToDelete.id);

      if (!success) {
        loggerFront.log('刪除帳本失敗');
        return;
      }

      setRefreshKey((prev) => prev + 1); // Info: (20250418 - Liz) 更新帳本清單
    } catch (error) {
      loggerFront.error('AccountBooksPageBody handleDeleteAccountBook error:', error);
    }
  };

  const messageModalData: IMessageModal = {
    title: t('account_book:ACCOUNT_BOOKS_PAGE_BODY.DELETE_MESSAGE_TITLE'),
    content: t('account_book:ACCOUNT_BOOKS_PAGE_BODY.DELETE_MESSAGE_CONTENT'),
    submitBtnStr: t('account_book:ACCOUNT_BOOKS_PAGE_BODY.DELETE'),
    submitBtnFunction: handleDeleteAccountBook,
    messageType: MessageType.WARNING,
    backBtnFunction: closeDeleteModal,
    backBtnStr: t('account_book:ACCOUNT_BOOKS_PAGE_BODY.CANCEL'),
  };

  const handleApiResponse = (resData: IPaginatedData<IAccountBookWithTeam[]>) => {
    setAccountBookList(resData.data);
    setTotalPage(resData.totalPages);

    // Info: (20250325 - Liz) 只有當 API 回傳的 page 與 currentPage 不同時才更新
    if (resData.page !== currentPage) setCurrentPage(resData.page);
  };

  const filterSection = userId && (
    <FilterSection<IAccountBookWithTeam[]>
      key={refreshKey}
      disableDateSearch
      className="flex-auto"
      params={{ userId }}
      apiName={APIName.LIST_ACCOUNT_BOOK_BY_USER_ID}
      onApiResponse={handleApiResponse}
      page={currentPage}
      pageSize={DEFAULT_PAGE_LIMIT_FOR_ACCOUNT_BOOK_LIST}
      sort={{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }}
    />
  );

  return (
    <>
      {/* Info: (20250602 - Liz) Desktop Version */}
      <main className="hidden min-h-full flex-col gap-40px tablet:flex">
        <section className="flex flex-col gap-40px laptop:flex-row laptop:items-center">
          {filterSection}

          <div className="flex items-center gap-16px">
            <button
              type="button"
              onClick={openCreateAccountBookModal}
              className="flex items-center gap-8px rounded-xs bg-button-surface-strong-secondary px-24px py-10px text-base font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
            >
              <BsPlusLg size={20} />
              <p>{t('account_book:ACCOUNT_BOOKS_PAGE_BODY.ADD_NEW')}</p>
            </button>

            <button
              type="button"
              className="flex items-center gap-8px rounded-xs border border-button-stroke-secondary bg-button-surface-soft-secondary px-24px py-10px text-base font-medium text-button-text-secondary-solid hover:border-button-stroke-secondary-hover hover:bg-button-surface-soft-secondary-hover disabled:border-button-stroke-disable disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
            >
              <BsEnvelope size={20} />
              <p>{t('account_book:ACCOUNT_BOOKS_PAGE_BODY.INVITE_CODE')}</p>
            </button>
          </div>
        </section>

        {isNoData ? (
          <NoData />
        ) : (
          <>
            <AccountBookList
              accountBookList={accountBookList}
              setAccountBookToEdit={setAccountBookToEdit}
              setAccountBookToTransfer={setAccountBookToTransfer}
              setAccountBookToChangeTag={setAccountBookToChangeTag}
              setAccountBookToDelete={setAccountBookToDelete}
              setRefreshKey={setRefreshKey}
              shouldGroupByTeam
            />
            <Pagination
              totalPages={totalPage}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          </>
        )}
      </main>

      {/* Info: (20250602 - Liz) Mobile Version */}
      <main className="flex min-h-full flex-col gap-32px tablet:hidden">
        <h1 className="text-base font-semibold text-text-neutral-secondary">
          {t('dashboard:ACCOUNT_BOOKS_PAGE.PAGE_TITLE')}
        </h1>
        {filterSection}
        <button
          type="button"
          onClick={openCreateAccountBookModal}
          className="flex items-center justify-center gap-8px rounded-xs bg-button-surface-strong-secondary px-24px py-10px text-base font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
        >
          <BsPlusLg size={20} />
          <span>{t('account_book:ACCOUNT_BOOKS_PAGE_BODY.ADD_NEW_ACCOUNT_BOOK')}</span>
        </button>

        {isNoData ? (
          <NoData />
        ) : (
          <>
            <AccountBookList
              accountBookList={accountBookList}
              setAccountBookToEdit={setAccountBookToEdit}
              setAccountBookToTransfer={setAccountBookToTransfer}
              setAccountBookToChangeTag={setAccountBookToChangeTag}
              setAccountBookToDelete={setAccountBookToDelete}
              setRefreshKey={setRefreshKey}
              shouldGroupByTeam
            />
            <Pagination
              totalPages={totalPage}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          </>
        )}
      </main>

      {/* Info: (20250602 - Liz) Modals */}
      {accountBookToEdit && (
        <AccountBookInfoModal
          accountBookToEdit={accountBookToEdit}
          closeAccountBookInfoModal={closeEditAccountBookModal}
          setRefreshKey={setRefreshKey}
        />
      )}

      {/* Info: (20241108 - Liz) Modals */}
      {isCreateAccountBookModalOpen && (
        <AccountBookInfoModal
          closeAccountBookInfoModal={closeCreateAccountBookModal}
          setRefreshKey={setRefreshKey}
        />
      )}

      {accountBookToEdit && (
        <AccountBookInfoModal
          accountBookToEdit={accountBookToEdit}
          closeAccountBookInfoModal={closeEditAccountBookModal}
          setRefreshKey={setRefreshKey}
        />
      )}

      {accountBookToTransfer && (
        <TransferAccountBookModal
          accountBookToTransfer={accountBookToTransfer}
          setAccountBookToTransfer={setAccountBookToTransfer}
          setRefreshKey={setRefreshKey}
        />
      )}

      {accountBookToChangeTag && (
        <ChangeTagModal
          accountBookToChangeTag={accountBookToChangeTag}
          setAccountBookToChangeTag={setAccountBookToChangeTag}
          setRefreshKey={setRefreshKey}
        />
      )}

      {accountBookToDelete && (
        <MessageModal
          messageModalData={messageModalData}
          isModalVisible={!!accountBookToDelete}
          modalVisibilityHandler={closeDeleteModal}
        />
      )}
    </>
  );
};

export default AccountBooksPageBody;
