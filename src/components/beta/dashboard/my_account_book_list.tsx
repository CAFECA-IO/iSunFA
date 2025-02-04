import Image from 'next/image';
import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import DashboardCardLayout from '@/components/beta/dashboard/dashboard_card_layout';
import MoreLink from '@/components/beta/dashboard/more_link';
import { ICompanyAndRole } from '@/interfaces/company';
import { ISUNFA_ROUTE } from '@/constants/url';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import CreateAccountBookModal from '@/components/beta/account_books_page/create_account_book_modal';
import MessageModal from '@/components/message_modal/message_modal';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import MyAccountBookListNoData from '@/components/beta/dashboard/my_account_book_list_no_data';

interface AccountBookItemProps {
  companyAndRole: ICompanyAndRole;
  setAccountBookToSelect: Dispatch<SetStateAction<ICompanyAndRole | undefined>>;
  isDisabled: boolean;
  dataIndex: number;
}

const AccountBookItem = ({
  companyAndRole,
  setAccountBookToSelect,
  isDisabled,
  dataIndex,
}: AccountBookItemProps) => {
  const { selectedAccountBook } = useUserCtx();
  const isCompanySelected = companyAndRole.company.id === selectedAccountBook?.id;

  const openMessageModal = () => {
    if (!isDisabled && !isCompanySelected) {
      setAccountBookToSelect(companyAndRole);
    }
  };

  return (
    <button
      data-index={dataIndex}
      key={companyAndRole.company.id}
      type="button"
      onClick={openMessageModal}
      disabled={isCompanySelected || isDisabled}
      className={`flex h-120px w-120px flex-none flex-col items-center justify-center gap-8px overflow-hidden rounded-sm border-2 px-8px py-12px ${isCompanySelected ? 'border-stroke-neutral-quaternary bg-surface-brand-primary-30' : ''} ${isDisabled ? 'border-stroke-neutral-quaternary bg-surface-neutral-main-background opacity-70' : ''} ${!isCompanySelected && !isDisabled ? 'border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2 hover:bg-surface-brand-primary-10' : ''} `}
    >
      <Image
        src={companyAndRole.company.imageId}
        alt={companyAndRole.company.name}
        width={60}
        height={60}
        className="h-60px w-60px rounded-sm bg-surface-neutral-surface-lv2 object-contain"
      ></Image>
      <p className="w-full truncate">{companyAndRole.company.name}</p>
    </button>
  );
};

interface CompanyListProps {
  companyAndRoleList: ICompanyAndRole[];
  setAccountBookToSelect: Dispatch<SetStateAction<ICompanyAndRole | undefined>>;
}

const AccountBookList = ({ companyAndRoleList, setAccountBookToSelect }: CompanyListProps) => {
  const { selectedAccountBook } = useUserCtx();
  const containerRef = useRef<HTMLDivElement>(null);
  const [disabledCards, setDisabledCards] = useState<number[]>([]);

  // Info: (20241216 - Liz) 監聽滾動事件，計算元素是否部分超出容器的左右邊界，得到左右滾動和部分遮蔽的效果
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const updateDisabledCards = () => {
      const newDisabledCards: number[] = [];
      const containerRect = container.getBoundingClientRect();

      Array.from(container.children).forEach((child, index) => {
        const cardRect = child.getBoundingClientRect();
        // Info: (20241216 - Liz) 判斷元素是否部分超出容器的左右邊界
        if (cardRect.left < containerRect.left || cardRect.right > containerRect.right) {
          newDisabledCards.push(index);
        }
      });

      setDisabledCards(newDisabledCards);
    };

    // Info: (20241216 - Liz) 監聽滾動事件
    container.addEventListener('scroll', updateDisabledCards);
    window.addEventListener('resize', updateDisabledCards);

    updateDisabledCards(); // Info: (20241216 - Liz) 初始化計算

    // Info: (20241216 - Liz) 回傳清理函式給 useEffect
    return () => {
      container.removeEventListener('scroll', updateDisabledCards);
      window.removeEventListener('resize', updateDisabledCards);
    };
  }, [companyAndRoleList]);

  // Info: (20241216 - Liz) 當選擇公司後，將滾動條重設到最左側
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (selectedAccountBook) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [selectedAccountBook]);

  return (
    <div ref={containerRef} className="flex max-w-full gap-24px overflow-x-auto px-1px pb-8px">
      {companyAndRoleList.map((companyAndRole, index) => (
        <AccountBookItem
          key={companyAndRole.company.id}
          companyAndRole={companyAndRole}
          setAccountBookToSelect={setAccountBookToSelect}
          isDisabled={disabledCards.includes(index)}
          dataIndex={index}
        />
      ))}
    </div>
  );
};

const MyAccountBookList = () => {
  const { t } = useTranslation('dashboard');
  const { userAuth } = useUserCtx();
  const [companyAndRoleList, setCompanyAndRoleList] = useState<ICompanyAndRole[]>([]);
  const isCompanyListEmpty = companyAndRoleList.length === 0;
  const [accountBookToSelect, setAccountBookToSelect] = useState<ICompanyAndRole | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateAccountBookModalOpen, setIsCreateAccountBookModalOpen] = useState(false);

  // Info: (20241126 - Liz) 選擇公司 API
  const { selectAccountBook, selectedAccountBook } = useUserCtx();

  const closeMessageModal = () => {
    setAccountBookToSelect(undefined);
  };

  const toggleCreateCompanyModal = () => {
    setIsCreateAccountBookModalOpen((prev) => !prev);
  };

  // Info: (20241126 - Liz) 打 API 選擇公司
  const handleSelectCompany = () => {
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
    submitBtnFunction: handleSelectCompany,
    messageType: MessageType.WARNING,
    backBtnFunction: closeMessageModal,
    backBtnStr: t('dashboard:COMMON.CANCEL'),
  };

  // Info: (20241120 - Liz) 打 API 取得使用者擁有的公司列表 (simple version)
  const { trigger: listUserCompanyAPI } = APIHandler<ICompanyAndRole[]>(APIName.LIST_USER_COMPANY);

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
        // Info: (20241216 - Liz) 已被選擇的公司顯示在第一個
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
        // Info: (20241120 - Liz) 取得使用者擁有的公司列表失敗時顯示錯誤訊息
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

        {isCompanyListEmpty ? (
          <MyAccountBookListNoData toggleCreateCompanyModal={toggleCreateCompanyModal} />
        ) : (
          <AccountBookList
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
            modalVisibilityHandler={toggleCreateCompanyModal}
            getCompanyList={getCompanyList}
          />
        )}
      </section>
    </DashboardCardLayout>
  );
};

export default MyAccountBookList;
