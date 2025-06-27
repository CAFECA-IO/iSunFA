import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import DashboardCardLayout from '@/components/beta/dashboard/dashboard_card_layout';
import MoreLink from '@/components/beta/dashboard/more_link';
import { IAccountBookWithTeam } from '@/interfaces/account_book';
import { ISUNFA_ROUTE } from '@/constants/url';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import AccountBookInfoModal from '@/components/beta/account_books_page/account_book_info_modal';
import MessageModal from '@/components/message_modal/message_modal';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import MyAccountBookListNoData from '@/components/beta/dashboard/my_account_book_list_no_data';
import MyAccountBookList from '@/components/beta/dashboard/my_account_book_list';
import { IPaginatedData } from '@/interfaces/pagination';
import loggerFront from '@/lib/utils/logger_front';

const MyAccountBooks = () => {
  const { t } = useTranslation('dashboard');
  const { userAuth } = useUserCtx();
  const [accountBookList, setAccountBookList] = useState<IAccountBookWithTeam[]>([]);
  const isAccountBookListEmpty = accountBookList.length === 0;
  const [accountBookToSelect, setAccountBookToSelect] = useState<
    IAccountBookWithTeam | undefined
  >();
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateAccountBookModalOpen, setIsCreateAccountBookModalOpen] = useState(false);

  // Info: (20241126 - Liz) 連結帳本 API (原為公司)
  const { connectAccountBook, connectedAccountBook } = useUserCtx();

  const closeMessageModal = () => setAccountBookToSelect(undefined);
  const openCreateAccountBookModal = () => setIsCreateAccountBookModalOpen(true);
  const closeCreateAccountBookModal = () => setIsCreateAccountBookModalOpen(false);

  // Info: (20241126 - Liz) 打 API 連結帳本(原為公司)
  const handleSelectAccountBook = async () => {
    if (isLoading) return;
    if (!accountBookToSelect) return;

    setIsLoading(true);

    try {
      const { success } = await connectAccountBook(accountBookToSelect.id);
      if (!success) {
        loggerFront.log('連結帳本失敗');
      }
    } catch (error) {
      loggerFront.error('AccountBookList handleConnect error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const messageModalData: IMessageModal = {
    title: t('dashboard:DASHBOARD.CHOOSE_THE_COMPANY'),
    content: (
      <div>
        <p className="font-normal text-text-neutral-secondary">
          {t('dashboard:DASHBOARD.ARE_YOU_SURE_YOU_WANT_TO')}{' '}
          <span className="font-semibold">{t('dashboard:DASHBOARD.CHOOSE_THE_COMPANY')}</span>{' '}
          {t('dashboard:DASHBOARD.SURE')}
        </p>
        <br />
        <p className="font-semibold text-text-neutral-primary">{accountBookToSelect?.name}</p>
      </div>
    ),
    submitBtnStr: t('dashboard:DASHBOARD.CHOOSE'),
    submitBtnFunction: handleSelectAccountBook,
    messageType: MessageType.WARNING,
    backBtnFunction: closeMessageModal,
    backBtnStr: t('dashboard:COMMON.CANCEL'),
  };

  // Info: (20250306 - Liz) 打 API 取得使用者擁有的帳本清單(原為公司)
  const { trigger: getAccountBookListByUserIdAPI } = APIHandler<
    IPaginatedData<IAccountBookWithTeam[]>
  >(APIName.LIST_ACCOUNT_BOOK_BY_USER_ID);

  const getAccountBookList = useCallback(async () => {
    if (!userAuth) return;

    try {
      const { data, success, code } = await getAccountBookListByUserIdAPI({
        params: { userId: userAuth.id },
        query: { page: 1, pageSize: 999, simple: true },
      });
      const accountBookListData = data?.data ?? []; // Info: (20250306 - Liz) 取出帳本清單

      if (success && data && accountBookListData.length > 0) {
        // Info: (20241216 - Liz) 已被選擇的帳本顯示在第一個(原為公司)
        if (connectedAccountBook) {
          const selectedAccountBookIndex = accountBookListData.findIndex(
            (item) => item.id === connectedAccountBook.id
          );

          if (selectedAccountBookIndex > -1) {
            const selectedCompanyItem = accountBookListData.splice(selectedAccountBookIndex, 1);
            accountBookListData.unshift(selectedCompanyItem[0]);
          }
        }

        setAccountBookList(accountBookListData);
      } else {
        // Info: (20241120 - Liz) 取得使用者擁有的帳本清單失敗時顯示錯誤訊息(原為公司)
        loggerFront.log('取得使用者擁有的帳本清單 failed:', code);
      }
    } catch (error) {
      loggerFront.error('取得使用者擁有的帳本清單 error:', error);
    }
  }, [connectedAccountBook, userAuth]);

  useEffect(() => {
    getAccountBookList();
  }, [getAccountBookList]);

  return (
    <DashboardCardLayout>
      <section className="flex flex-col gap-24px">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-text-neutral-secondary">
            {t('dashboard:DASHBOARD.ACCOUNT_BOOKS')}
          </h3>

          <MoreLink href={ISUNFA_ROUTE.ACCOUNT_BOOKS_PAGE} />
        </div>

        {isAccountBookListEmpty ? (
          <MyAccountBookListNoData openCreateAccountBookModal={openCreateAccountBookModal} />
        ) : (
          <MyAccountBookList
            accountBookList={accountBookList}
            setAccountBookToSelect={setAccountBookToSelect}
          />
        )}

        {/* // Info: (20241209 - Liz) Modals */}
        {accountBookToSelect && (
          <MessageModal
            messageModalData={messageModalData}
            isModalVisible={!!accountBookToSelect}
            modalVisibilityHandler={closeMessageModal}
          />
        )}

        {isCreateAccountBookModalOpen && (
          <AccountBookInfoModal
            closeAccountBookInfoModal={closeCreateAccountBookModal}
            getAccountBookList={getAccountBookList}
          />
        )}
      </section>
    </DashboardCardLayout>
  );
};

export default MyAccountBooks;
