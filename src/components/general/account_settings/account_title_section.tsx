import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { IAccount, IPaginatedAccount } from '@/interfaces/accounting_account';
import { useTranslation } from 'next-i18next';
import { RiDeleteBinLine } from 'react-icons/ri';
import Skeleton from '@/components/skeleton/skeleton';
import { FiPlusCircle } from 'react-icons/fi';
import { AccountTypeBeta } from '@/constants/account';
import { TitleFormType } from '@/constants/accounting_setting';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { useModalContext } from '@/contexts/modal_context';
import { useUserCtx } from '@/contexts/user_context';
import { MessageType } from '@/interfaces/message_modal';
import { FREE_ACCOUNT_BOOK_ID } from '@/constants/config';
import { ToastType } from '@/interfaces/toastify';
import { ToastId } from '@/constants/toast_id';
import { TrialBalanceItem } from '@/interfaces/trial_balance';

interface IAccountingTitleSettingModalProps {
  accountTitleList: IAccount[];
  setFormType: React.Dispatch<React.SetStateAction<TitleFormType>>;
  setSelectedAccountTitle: React.Dispatch<React.SetStateAction<IAccount | null>>;
  isLoading: boolean;
  setIsRecallApi: React.Dispatch<React.SetStateAction<boolean>>;
  trialBalanceAccountList: TrialBalanceItem[];
}

interface IAccountSecondLayerItemProps {
  titleAccount: IAccount;
  setFormType: React.Dispatch<React.SetStateAction<TitleFormType>>;
  childList: IAccount[];
  setSelectedAccountTitle: React.Dispatch<React.SetStateAction<IAccount | null>>;
  setIsRecallApi: React.Dispatch<React.SetStateAction<boolean>>;
  trialBalanceAccountList: TrialBalanceItem[];
}

interface IAccountThirdLayerItemProps {
  isActive: boolean;
  titleCode: string;
  titleName: string;
  clickHandler: () => void;
  deleteHandler: () => void;
  isUsed: boolean;
}

// Info: (20241111 - Julian) 會計科目的第三層項目(最底層)
const AccountThirdLayerItem: React.FC<IAccountThirdLayerItemProps> = ({
  isActive,
  titleCode,
  titleName,
  clickHandler,
  deleteHandler,
  isUsed,
}) => {
  const { t } = useTranslation('common');
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();

  const deleteBtnClickHandler = () => {
    // Info: (20250617 - Anna) 如果該科目已經用來作帳，則不能刪除
    if (isUsed) {
      toastHandler({
        id: ToastId.ACCOUNTING_DELETE_ERROR,
        type: ToastType.WARNING,
        content: t('settings:ACCOUNTING_SETTING_MODAL.DELETE_ACCOUNT_TITLE_USED_IN_TRIAL_BALANCE'),
        closeable: true,
      });
      return;
    }
    messageModalDataHandler({
      messageType: MessageType.WARNING,
      title: t('settings:ACCOUNTING_SETTING_MODAL.REMOVE_ACCOUNT_TITLE_MESSAGE_TITLE'),
      content: t('settings:ACCOUNTING_SETTING_MODAL.REMOVE_ACCOUNT_TITLE_MESSAGE_CONTENT'),
      backBtnStr: t('settings:ACCOUNTING_SETTING_MODAL.CANCEL_BTN'),
      submitBtnStr: t('settings:ACCOUNTING_SETTING_MODAL.DELETE_BTN'),
      submitBtnFunction: deleteHandler,
    });
    messageModalVisibilityHandler();
  };

  return (
    <div
      className={`mt-4px flex w-full items-center rounded-full px-8px py-4px hover:cursor-pointer ${isActive ? 'bg-surface-brand-primary-30' : 'hover:bg-surface-brand-primary-10'}`}
    >
      <div
        onClick={clickHandler} // Info: (20241113 - Julian) 將點擊事件放在這層，和刪除紐分開
        className="flex w-150px flex-1 items-center gap-4px whitespace-nowrap text-left text-xs font-semibold text-text-neutral-link"
      >
        <div className="flex w-16px shrink-0 items-center justify-center gap-4px">
          <Image src="/icons/caret.svg" width={16} height={16} alt="caret_icon" />
        </div>
        <p>{titleCode}</p>
        <p className="truncate">{titleName}</p>
      </div>
      {/* Info: (20241111 - Julian) 刪除按鈕 */}
      <button
        type="button"
        className="shrink-0 text-icon-surface-single-color-primary"
        onClick={deleteBtnClickHandler}
      >
        <RiDeleteBinLine />
      </button>
    </div>
  );
};

// Info: (20241111 - Julian) 會計科目的第二層項目(原本的會計科目，不可刪除和修改)
const AccountSecondLayerItem: React.FC<IAccountSecondLayerItemProps> = ({
  titleAccount,
  setFormType,
  childList,
  setSelectedAccountTitle,
  setIsRecallApi,
  trialBalanceAccountList,
}) => {
  const { t, i18n } = useTranslation(['common', 'reports']);
  const { connectedAccountBook } = useUserCtx();
  const { toastHandler } = useModalContext();

  const accountBookId = connectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID;

  // Info: (20250521 - Julian) 如果翻譯名稱不存在，則使用原本的名稱
  const nameKey = `reports:ACCOUNTING_ACCOUNT.${titleAccount.name}`;
  const translatedName = i18n.exists(nameKey) ? t(nameKey) : titleAccount.name;

  const {
    trigger: deleteAccount,
    isLoading,
    success,
    error,
  } = APIHandler<IPaginatedAccount>(APIName.DELETE_ACCOUNT_BY_ID);

  // Info: (20241114 - Julian) 用 useOuterClick 來判斷是否展開
  const {
    targetRef,
    componentVisible: isExpanded,
    setComponentVisible: setIsExpanded,
  } = useOuterClick<HTMLDivElement>(false);

  const [activeChild, setActiveChild] = useState<IAccount | null>(null);

  const toggleExpand = () => setIsExpanded(!isExpanded);
  const clickAddButton = () => {
    setFormType(TitleFormType.ADD); // Info: (20241111 - Julian) 將 formType 設為 add
    setSelectedAccountTitle(titleAccount); // Info: (20241111 - Julian) 將 title 傳到右邊的 <AddNewTitleSection />
  };

  // Info: (20241111 - Julian) 將 code 傳到 modal 那層，以連動到右邊的 <AddNewTitleSection />
  const addButton = isExpanded ? (
    <button type="button" onClick={clickAddButton}>
      <FiPlusCircle />
    </button>
  ) : null;

  useEffect(() => {
    if (!isLoading) {
      if (success) {
        // Info: (20241114 - Julian) 刪除成功時，顯示成功訊息，並重新呼叫 API
        toastHandler({
          id: ToastId.ACCOUNTING_DELETE_SUCCESS,
          type: ToastType.SUCCESS,
          content: t('settings:ACCOUNTING_SETTING_MODAL.TOAST_ACCOUNT_TITLE_DELETE_SUCCESS'),
          closeable: true,
        });
        setIsRecallApi((prev) => !prev);
      } else if (error) {
        // Info: (20241114 - Julian) 刪除失敗時，顯示錯誤訊息
        toastHandler({
          id: ToastId.ACCOUNTING_DELETE_ERROR,
          type: ToastType.ERROR,
          content: t('settings:ACCOUNTING_SETTING_MODAL.TOAST_ACCOUNT_TITLE_DELETE_FAIL'),
          closeable: true,
        });
      }
    }
  }, [success, isLoading, error]);

  const displayChildList =
    childList.length > 0
      ? childList.map((child) => {
          // Info: (20241111 - Julian) 如果 activeChild 存在，且 activeChild 的 id 等於 child 的 id，則 isActive 為 true
          const isActive = activeChild ? activeChild.id === child.id : false;

          // Info: (20241114 - Julian) 點擊子項目時，將 activeChild 設為該子項目，並將 formType 設為 edit
          const clickChildHandler = () => {
            setActiveChild(child); // Info: (20241113 - Julian) 將 activeChild 設為該子項目
            setFormType(TitleFormType.EDIT); // Info: (20241113 - Julian) 將 formType 設為 edit
            setSelectedAccountTitle(child); // Info: (20241113 - Julian)  將 title 傳到右邊的 <AddNewTitleSection />
          };
          // Info: (20250617 - Anna) 判斷該科目是否已經用來作帳
          const isUsedInTrialBalance = trialBalanceAccountList.some((item) =>
            item.subAccounts?.some((sub) => sub.id === child.id)
          );

          // Info: (20241114 - Julian) 點擊刪除按鈕時，觸發刪除事件
          const deleteAccountHandler = async () => {
            deleteAccount({ params: { accountBookId, accountId: child.id } });
          };
          return (
            <AccountThirdLayerItem
              key={child.id}
              isActive={isActive}
              titleCode={child.code}
              titleName={child.name}
              clickHandler={clickChildHandler}
              deleteHandler={deleteAccountHandler}
              isUsed={isUsedInTrialBalance}
            />
          );
        })
      : null;

  return (
    <div ref={targetRef} className="flex flex-col">
      {/* Info: (20241108 - Julian) 項目標題 */}
      <div
        className={`flex items-center rounded-full px-8px py-4px ${isExpanded ? 'bg-surface-brand-primary-10' : 'hover:bg-surface-brand-primary-10'} hover:cursor-pointer`}
      >
        <div
          onClick={toggleExpand}
          className="flex w-200px flex-1 items-center gap-4px text-left text-xs font-semibold text-text-brand-secondary-lv1"
        >
          <div className="flex w-36px shrink-0 items-center justify-center gap-4px">
            <Image src="/icons/folder.svg" width={16} height={16} alt="folder_icon" />
            <Image src="/icons/caret.svg" width={16} height={16} alt="caret_icon" />
          </div>
          <p>{titleAccount.code}</p>
          <p className="truncate">{translatedName}</p>
        </div>
        {/* Info: (20241111 - Julian) 新增按鈕 */}
        {addButton}
      </div>

      {/* Info: (20241111 - Julian) 顯示子項目 */}
      <div
        className={`grid ${isExpanded ? 'grid-rows-1' : 'grid-rows-0'} overflow-hidden transition-all duration-300 ease-in-out`}
      >
        <div className="flex">
          {/* Info: (20241111 - Julian) 直線 */}
          <div className="w-20px pl-15px">
            <div className="h-full w-px bg-tree-stroke-divider"></div>
          </div>
          <div className="flex flex-1 flex-col">{displayChildList}</div>
        </div>
      </div>
    </div>
  );
};

const AccountTitleSection: React.FC<IAccountingTitleSettingModalProps> = ({
  accountTitleList,
  isLoading,
  setFormType,
  setSelectedAccountTitle,
  setIsRecallApi,
  trialBalanceAccountList,
}) => {
  const { t } = useTranslation('common');

  // Info: (20241111 - Julian) 資產、負債、權益、銷貨收入、其他收益、成本、費用、營業外收支、其他綜合損益
  const accountTypeList = Object.values(AccountTypeBeta);

  const accountTitleSecondList = accountTitleList.filter((account) => !account.code.includes('-'));
  const accountTitleThirdList = accountTitleList.filter((account) => account.code.includes('-'));

  const skeletonList = (
    <div className="flex flex-col gap-8px">
      {Array.from({ length: 3 }).map((_, index) => (
        // Deprecated: (20241112 - Julian) to be fixed
        // eslint-disable-next-line react/no-array-index-key
        <Skeleton key={index} width={260} height={25} />
      ))}
    </div>
  );

  /* Info: (20241112 - Julian) 將 accountTitleList 分成三層
  /* 第一層是會計類型列表，共有 9 種
  /* 第二層是代碼中沒有 '-' 的會計科目，也就是原本的會計科目列表
  /* 第三層是代碼中有 '-' 的會計科目，也就是用戶自訂的會計科目 */
  const nestedAccountTitleList = accountTypeList.map((firstLayer) => {
    const accountTitleSecondLayer = accountTitleSecondList.filter(
      (account) => account.type === firstLayer
    );

    return {
      firstLayer: {
        title: firstLayer,
        secondLayer: accountTitleSecondLayer.map((secondLayer) => {
          return {
            title: secondLayer,
            thirdLayer: accountTitleThirdList.filter((thirdLayer) =>
              thirdLayer.code.startsWith(`${secondLayer.code}-`)
            ),
          };
        }),
      },
    };
  });

  const nestedAccountTitleMenu = nestedAccountTitleList.map((nestedAccount) => {
    const { title: mainTitle, secondLayer } = nestedAccount.firstLayer;

    const secondLayerMenu = isLoading
      ? skeletonList
      : secondLayer.map((second) => {
          const { thirdLayer } = second;
          return (
            <AccountSecondLayerItem
              key={second.title.id}
              titleAccount={second.title}
              setFormType={setFormType}
              childList={thirdLayer}
              setSelectedAccountTitle={setSelectedAccountTitle}
              setIsRecallApi={setIsRecallApi}
              trialBalanceAccountList={trialBalanceAccountList}
            />
          );
        });

    return (
      <div key={mainTitle} className="flex flex-col">
        <div className="flex items-center gap-8px">
          <Image
            src={`/icons/account_type_${mainTitle}.svg`} // ToDo: (20241108 - Julian) 還差 revenue, cost, income, expense 的 icon
            width={16}
            height={16}
            alt={`${mainTitle}_icon`}
          />
          <p className="whitespace-nowrap text-sm font-medium text-divider-text-lv-1">
            {t(`settings:ACCOUNTING_SETTING_MODAL.ACC_TYPE_${mainTitle.toUpperCase()}`)}
          </p>
          <hr className="w-fit flex-1 border-divider-stroke-lv-1" />
        </div>
        <div className="flex flex-col py-4px">{secondLayerMenu}</div>
      </div>
    );
  });

  return (
    <div className="h-400px rounded-sm bg-surface-brand-primary-5 p-24px shadow-Dropshadow_XS tablet:h-500px">
      <div className="flex h-full flex-col overflow-y-auto overflow-x-hidden">
        {nestedAccountTitleMenu}
      </div>
    </div>
  );
};

export default AccountTitleSection;
