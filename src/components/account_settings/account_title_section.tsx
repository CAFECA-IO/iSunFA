import React from 'react';
import Image from 'next/image';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { IAccount } from '@/interfaces/accounting_account';
import { useTranslation } from 'next-i18next';
import { RiDeleteBinLine } from 'react-icons/ri';
import Skeleton from '@/components/skeleton/skeleton';
import { FiPlusCircle } from 'react-icons/fi';
import { AccountTypeBeta } from '@/constants/account';

interface IAccountingTitleSettingModalProps {
  accountTitleList: IAccount[];
  setSelectedAccountTitle: React.Dispatch<React.SetStateAction<IAccount | null>>;
  isLoading: boolean;
}

interface IAccountTitleItemProps {
  titleAccount: IAccount;
  childList: IAccount[];
  setSelectedAccountTitle: React.Dispatch<React.SetStateAction<IAccount | null>>;
}

const AccountTitleItem: React.FC<IAccountTitleItemProps> = ({
  titleAccount,
  childList,
  setSelectedAccountTitle,
}) => {
  const {
    targetRef,
    componentVisible: isExpanded,
    setComponentVisible: setIsExpanded,
  } = useOuterClick<HTMLDivElement>(false);

  const toggleExpand = () => setIsExpanded(!isExpanded);
  const clickAddButton = () => setSelectedAccountTitle(titleAccount);

  // Info: (20241111 - Julian) 將 code 傳到 modal 那層，以連動到右邊的 <AddNewTitleSection />
  const addButton = isExpanded ? (
    <button type="button" onClick={clickAddButton}>
      <FiPlusCircle />
    </button>
  ) : null;

  return (
    <div ref={targetRef} className="flex flex-col">
      {/* Info: (20241108 - Julian) 項目標題 */}
      <div
        className={`flex items-center rounded-full px-8px py-4px ${isExpanded ? 'bg-surface-brand-primary-30' : 'hover:bg-surface-brand-primary-10'} hover:cursor-pointer`}
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
          <p className="truncate">{titleAccount.name}</p>
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
          <div className="flex flex-1 flex-col">
            {childList.map((child) => (
              <div key={child.id} className="flex w-full items-center rounded-full px-8px py-4px">
                <div className="flex w-150px flex-1 items-center gap-4px whitespace-nowrap text-left text-xs font-semibold text-text-neutral-link">
                  <div className="flex w-16px shrink-0 items-center justify-center gap-4px">
                    <Image src="/icons/caret.svg" width={16} height={16} alt="caret_icon" />
                  </div>
                  <p>{child.code}</p>
                  <p className="truncate">{child.name}</p>
                </div>
                {/* Info: (20241111 - Julian) 刪除按鈕 */}
                <button type="button" className="shrink-0 text-icon-surface-single-color-primary">
                  <RiDeleteBinLine />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AccountTitleSection: React.FC<IAccountingTitleSettingModalProps> = ({
  accountTitleList,
  isLoading,
  setSelectedAccountTitle,
}) => {
  const { t } = useTranslation('common');

  // Info: (20241111 - Julian) 資產、負債、權益、銷貨收入、其他收益、成本、費用、營業外收支、其他綜合損益
  const accountTypeList = Object.values(AccountTypeBeta);

  const accountTitleSecondList = accountTitleList.filter((account) => !account.code.includes('-'));
  const accountTitleThirdList = accountTitleList.filter((account) => account.code.includes('-'));

  const skeletonList = (
    <div className="flex flex-col gap-8px">
      {Array.from({ length: 3 }).map((_, index) => (
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
    const mainTitle = nestedAccount.firstLayer.title;
    const { secondLayer } = nestedAccount.firstLayer;

    const secondLayerMenu = isLoading
      ? skeletonList
      : secondLayer.map((second) => {
          const { thirdLayer } = second;
          return (
            <AccountTitleItem
              key={second.title.id}
              titleAccount={second.title}
              childList={thirdLayer}
              setSelectedAccountTitle={setSelectedAccountTitle}
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
            {t(`setting:ACCOUNTING_SETTING_MODAL.ACC_TYPE_${mainTitle.toUpperCase()}`)}
          </p>
          <hr className="w-fit flex-1 border-divider-stroke-lv-1" />
        </div>
        <div className="flex flex-col py-4px">{secondLayerMenu}</div>
      </div>
    );
  });

  return (
    <div className="rounded-sm bg-surface-brand-primary-5 p-24px shadow-Dropshadow_XS">
      <div className="flex h-550px flex-col overflow-y-auto overflow-x-hidden">
        {nestedAccountTitleMenu}
      </div>
    </div>
  );
};

export default AccountTitleSection;
