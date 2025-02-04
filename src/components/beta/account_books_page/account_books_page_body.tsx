import { useState } from 'react';
import { BsEnvelope, BsPlusLg } from 'react-icons/bs';
import { IPaginatedData } from '@/interfaces/pagination';
import { ICompanyAndRole } from '@/interfaces/company';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { APIName } from '@/constants/api_connection';
import { DEFAULT_PAGE_LIMIT_FOR_ACCOUNT_BOOK_LIST } from '@/constants/config';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import Pagination from '@/components/pagination/pagination';
import MessageModal from '@/components/message_modal/message_modal';
import FilterSection from '@/components/filter_section/filter_section';
import NoData from '@/components/beta/account_books_page/no_data';
import UploadAccountBookCompanyPictureModal from '@/components/beta/account_books_page/upload_account_book_company_picture_modal';
import CreateAccountBookModal from '@/components/beta/account_books_page/create_account_book_modal';
import ChangeTagModal from '@/components/beta/account_books_page/change_tag_modal';
import AccountBookList from '@/components/beta/account_books_page/account_book_list';

const AccountBooksPageBody = () => {
  const { t } = useTranslation(['company']);
  const { userAuth, deleteAccountBook } = useUserCtx();
  const userId = userAuth?.id;

  const [refreshKey, setRefreshKey] = useState<number>(0); // Info: (20241114 - Liz) This is a workaround to refresh the FilterSection component to retrigger the API call. This is not the best solution.

  const [isCreateAccountBookModalOpen, setIsCreateAccountBookModalOpen] = useState(false);
  const [accountBookToEdit, setAccountBookToEdit] = useState<ICompanyAndRole | undefined>();
  const [accountBookToDelete, setAccountBookToDelete] = useState<ICompanyAndRole | undefined>();
  const [accountBookToUploadAvatar, setAccountBookToUploadAvatar] = useState<
    ICompanyAndRole | undefined
  >();
  const [totalPage, setTotalPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [accountBookList, setAccountBookList] = useState<ICompanyAndRole[]>([]);

  const isNoData = accountBookList.length === 0;

  const toggleCreateAccountBookModal = () => {
    setIsCreateAccountBookModalOpen((prev) => !prev);
  };

  const closeDeleteModal = () => {
    setAccountBookToDelete(undefined);
  };

  // Info: (20241115 - Liz) 打 API 刪除帳本(原為公司)
  const handleDeleteAccountBook = async () => {
    if (!accountBookToDelete) return;

    try {
      const data = await deleteAccountBook(accountBookToDelete.company.id);

      if (data) {
        setRefreshKey((prev) => prev + 1);
      } else {
        // Deprecated: (20241115 - Liz)
        // eslint-disable-next-line no-console
        console.log('刪除帳本失敗');
      }
    } catch (error) {
      // Deprecated: (20241115 - Liz)
      // eslint-disable-next-line no-console
      console.error('AccountBooksPageBody handleDeleteAccountBook error:', error);
    }
  };

  const messageModalData: IMessageModal = {
    title: t('company:ACCOUNT_BOOKS_PAGE_BODY.DELETE_MESSAGE_TITLE'),
    content: t('company:ACCOUNT_BOOKS_PAGE_BODY.DELETE_MESSAGE_CONTENT'),
    submitBtnStr: t('company:ACCOUNT_BOOKS_PAGE_BODY.DELETE'),
    submitBtnFunction: handleDeleteAccountBook,
    messageType: MessageType.WARNING,
    backBtnFunction: closeDeleteModal,
    backBtnStr: t('company:ACCOUNT_BOOKS_PAGE_BODY.CANCEL'),
  };

  const handleApiResponse = (resData: IPaginatedData<ICompanyAndRole[]>) => {
    setAccountBookList(resData.data);
    setTotalPage(resData.totalPages);
    setCurrentPage(resData.page);
  };

  return (
    <main className="flex min-h-full flex-col gap-40px">
      <section className="flex items-center gap-40px">
        {userId && (
          <FilterSection<ICompanyAndRole[]>
            key={refreshKey}
            disableDateSearch
            className="flex-auto"
            params={{ userId }}
            apiName={APIName.LIST_USER_COMPANY}
            onApiResponse={handleApiResponse}
            page={currentPage}
            pageSize={DEFAULT_PAGE_LIMIT_FOR_ACCOUNT_BOOK_LIST}
          />
        )}

        <div className="flex items-center gap-16px">
          <button
            type="button"
            onClick={toggleCreateAccountBookModal}
            className="flex items-center gap-8px rounded-xs bg-button-surface-strong-secondary px-24px py-10px text-base font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
          >
            <BsPlusLg size={20} />
            <p>{t('company:ACCOUNT_BOOKS_PAGE_BODY.ADD_NEW')}</p>
          </button>

          <button
            type="button"
            className="flex items-center gap-8px rounded-xs border border-button-stroke-secondary bg-button-surface-soft-secondary px-24px py-10px text-base font-medium text-button-text-secondary-solid hover:border-button-stroke-secondary-hover hover:bg-button-surface-soft-secondary-hover disabled:border-button-stroke-disable disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
          >
            <BsEnvelope size={20} />
            <p>{t('company:ACCOUNT_BOOKS_PAGE_BODY.INVITE_CODE')}</p>
          </button>
        </div>
      </section>

      {isNoData && <NoData />}
      {!isNoData && (
        <>
          <AccountBookList
            accountBookList={accountBookList}
            setAccountBookToEdit={setAccountBookToEdit}
            setAccountBookToDelete={setAccountBookToDelete}
            setAccountBookToUploadAvatar={setAccountBookToUploadAvatar}
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
          modalVisibilityHandler={toggleCreateAccountBookModal}
          setRefreshKey={setRefreshKey}
        />
      )}

      {accountBookToEdit && (
        <ChangeTagModal
          accountBookToEdit={accountBookToEdit}
          isModalOpen={!!accountBookToEdit}
          setAccountBookToEdit={setAccountBookToEdit}
          setRefreshKey={setRefreshKey}
        />
      )}

      {accountBookToUploadAvatar && (
        <UploadAccountBookCompanyPictureModal
          accountBookToUploadAvatar={accountBookToUploadAvatar}
          isModalOpen={!!accountBookToUploadAvatar}
          setAccountBookToUploadAvatar={setAccountBookToUploadAvatar}
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
