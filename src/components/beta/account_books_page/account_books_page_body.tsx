import { useState } from 'react';
import { BsEnvelope, BsPlusLg } from 'react-icons/bs';
import { IPaginatedData } from '@/interfaces/pagination';
import { IAccountBookForUserWithTeam } from '@/interfaces/account_book';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { APIName } from '@/constants/api_connection';
import { DEFAULT_PAGE_LIMIT_FOR_ACCOUNT_BOOK_LIST } from '@/constants/config';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import Pagination from '@/components/pagination/pagination';
import MessageModal from '@/components/message_modal/message_modal';
import FilterSection from '@/components/filter_section/filter_section';
import NoData from '@/components/beta/account_books_page/no_data';
import UploadCompanyPictureModal from '@/components/beta/account_books_page/upload_company_picture_modal';
import CreateAccountBookModal from '@/components/beta/account_books_page/create_account_book_modal';
import ChangeTagModal from '@/components/beta/account_books_page/change_tag_modal';
import AccountBookList from '@/components/beta/account_books_page/account_book_list';
import TransferAccountBookModal from '@/components/beta/account_books_page/transfer_account_book_modal';

const AccountBooksPageBody = () => {
  const { t } = useTranslation(['account_book']);
  const { userAuth, deleteAccountBook } = useUserCtx();
  const userId = userAuth?.id;

  const [refreshKey, setRefreshKey] = useState<number>(0); // Info: (20241114 - Liz) This is a workaround to refresh the FilterSection component to retrigger the API call. This is not the best solution.

  const [isCreateAccountBookModalOpen, setIsCreateAccountBookModalOpen] = useState(false);
  const [accountBookToTransfer, setAccountBookToTransfer] = useState<
    IAccountBookForUserWithTeam | undefined
  >();
  const [accountBookToEdit, setAccountBookToEdit] = useState<
    IAccountBookForUserWithTeam | undefined
  >();
  const [accountBookToDelete, setAccountBookToDelete] = useState<
    IAccountBookForUserWithTeam | undefined
  >();
  const [accountBookToUploadPicture, setAccountBookToUploadPicture] = useState<
    IAccountBookForUserWithTeam | undefined
  >();
  const [totalPage, setTotalPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [accountBookList, setAccountBookList] = useState<IAccountBookForUserWithTeam[]>([]);

  const isNoData = accountBookList.length === 0;

  const openCreateAccountBookModal = () => {
    setIsCreateAccountBookModalOpen(true);
  };
  const closeCreateAccountBookModal = () => {
    setIsCreateAccountBookModalOpen(false);
  };

  const closeDeleteModal = () => {
    setAccountBookToDelete(undefined);
  };

  // Info: (20241115 - Liz) 打 API 刪除帳本(原為公司)
  const handleDeleteAccountBook = async () => {
    if (!accountBookToDelete) return;

    try {
      const data = await deleteAccountBook(accountBookToDelete.company.id);

      if (!data) {
        // Deprecated: (20241115 - Liz)
        // eslint-disable-next-line no-console
        console.log('刪除帳本失敗');
        return;
      }

      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      // Deprecated: (20241115 - Liz)
      // eslint-disable-next-line no-console
      console.error('AccountBooksPageBody handleDeleteAccountBook error:', error);
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

  const handleApiResponse = (resData: IPaginatedData<IAccountBookForUserWithTeam[]>) => {
    setAccountBookList(resData.data);
    setTotalPage(resData.totalPages);
    setCurrentPage(resData.page);
  };

  return (
    <main className="flex min-h-full flex-col gap-40px">
      <section className="flex items-center gap-40px">
        {userId && (
          <FilterSection<IAccountBookForUserWithTeam[]>
            key={refreshKey}
            disableDateSearch
            className="flex-auto"
            params={{ userId }}
            apiName={APIName.LIST_ACCOUNT_BOOK_BY_USER_ID}
            onApiResponse={handleApiResponse}
            page={currentPage}
            pageSize={DEFAULT_PAGE_LIMIT_FOR_ACCOUNT_BOOK_LIST}
          />
        )}

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

      {isNoData && <NoData />}
      {!isNoData && (
        <>
          <AccountBookList
            accountBookList={accountBookList}
            setAccountBookToTransfer={setAccountBookToTransfer}
            setAccountBookToEdit={setAccountBookToEdit}
            setAccountBookToDelete={setAccountBookToDelete}
            setAccountBookToUploadPicture={setAccountBookToUploadPicture}
            shouldGroupByTeam
          />
          <Pagination
            totalPages={totalPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
        </>
      )}

      {/* // Info: (20241108 - Liz) Modals */}
      {isCreateAccountBookModalOpen && (
        <CreateAccountBookModal
          closeCreateAccountBookModal={closeCreateAccountBookModal}
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

      {accountBookToEdit && (
        <ChangeTagModal
          accountBookToEdit={accountBookToEdit}
          setAccountBookToEdit={setAccountBookToEdit}
          setRefreshKey={setRefreshKey}
        />
      )}

      {accountBookToUploadPicture && (
        <UploadCompanyPictureModal
          accountBookToUploadPicture={accountBookToUploadPicture}
          setAccountBookToUploadPicture={setAccountBookToUploadPicture}
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
    </main>
  );
};

export default AccountBooksPageBody;
