import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import DashboardCardLayout from '@/components/beta/dashboard/dashboard_card_layout';
import MoreLink from '@/components/beta/dashboard/more_link';
import { IAccountBookForUser } from '@/interfaces/account_book';
import { ISUNFA_ROUTE } from '@/constants/url';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import CreateAccountBookModal from '@/components/beta/account_books_page/create_account_book_modal';
import MessageModal from '@/components/message_modal/message_modal';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import MyAccountBookListNoData from '@/components/beta/dashboard/my_account_book_list_no_data';
import MyAccountBookList from '@/components/beta/dashboard/my_account_book_list';

const MyAccountBooks = () => {
  const { t } = useTranslation('dashboard');
  const { userAuth } = useUserCtx();
  const [companyAndRoleList, setCompanyAndRoleList] = useState<IAccountBookForUser[]>([]);
  const isAccountBookListEmpty = companyAndRoleList.length === 0;
  const [accountBookToSelect, setAccountBookToSelect] = useState<IAccountBookForUser | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateAccountBookModalOpen, setIsCreateAccountBookModalOpen] = useState(false);

  // Info: (20241126 - Liz) 選擇帳本 API (原為公司)
  const { selectAccountBook, selectedAccountBook } = useUserCtx();

  const closeMessageModal = () => {
    setAccountBookToSelect(undefined);
  };

  const openCreateAccountBookModal = () => {
    setIsCreateAccountBookModalOpen(true);
  };
  const closeCreateAccountBookModal = () => {
    setIsCreateAccountBookModalOpen(false);
  };

  // Info: (20241126 - Liz) 打 API 選擇帳本(原為公司)
  const handleSelectAccountBook = () => {
    if (isLoading) return;
    if (!accountBookToSelect) return;

    setIsLoading(true);

    try {
      selectAccountBook(accountBookToSelect.company.id);
    } catch (error) {
      // Deprecated: (20241126 - Liz)
      // eslint-disable-next-line no-console
      console.log('AccountBookList handleConnect error:', error);
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
        <p className="font-semibold text-text-neutral-primary">
          {accountBookToSelect?.company.name}
        </p>
      </div>
    ),
    submitBtnStr: t('dashboard:DASHBOARD.CHOOSE'),
    submitBtnFunction: handleSelectAccountBook,
    messageType: MessageType.WARNING,
    backBtnFunction: closeMessageModal,
    backBtnStr: t('dashboard:COMMON.CANCEL'),
  };

  // Info: (20241120 - Liz) 打 API 取得使用者擁有的帳本列表(原為公司) - simple version
  const { trigger: listUserCompanyAPI } = APIHandler<IAccountBookForUser[]>(
    APIName.LIST_USER_COMPANY
  );

  const getCompanyList = useCallback(async () => {
    if (!userAuth) return;

    try {
      const {
        data: userCompanyList,
        success,
        code,
      } = await listUserCompanyAPI({
        params: { userId: userAuth.id },
        query: { simple: true },
      });

      if (success && userCompanyList && userCompanyList.length > 0) {
        // Info: (20241216 - Liz) 已被選擇的帳本顯示在第一個(原為公司)
        if (selectedAccountBook) {
          const selectedCompanyIndex = userCompanyList.findIndex(
            (companyAndRole) => companyAndRole.company.id === selectedAccountBook.id
          );

          if (selectedCompanyIndex > -1) {
            const selectedCompanyItem = userCompanyList.splice(selectedCompanyIndex, 1);
            userCompanyList.unshift(selectedCompanyItem[0]);
          }
        }

        setCompanyAndRoleList(userCompanyList);
      } else {
        // Info: (20241120 - Liz) 取得使用者擁有的帳本列表失敗時顯示錯誤訊息(原為公司)
        // Deprecated: (20241120 - Liz)
        // eslint-disable-next-line no-console
        console.log('listUserCompanyAPI(Simple) failed:', code);
      }
    } catch (error) {
      // Deprecated: (20241120 - Liz)
      // eslint-disable-next-line no-console
      console.error('listUserCompanyAPI(Simple) error:', error);
    }
  }, [selectedAccountBook, userAuth]);

  useEffect(() => {
    getCompanyList();
  }, [getCompanyList]);

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
            companyAndRoleList={companyAndRoleList}
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
          <CreateAccountBookModal
            closeCreateAccountBookModal={closeCreateAccountBookModal}
            getCompanyList={getCompanyList}
          />
        )}
      </section>
    </DashboardCardLayout>
  );
};

export default MyAccountBooks;
