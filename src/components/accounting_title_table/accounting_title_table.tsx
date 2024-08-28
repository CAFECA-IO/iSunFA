import { FaRegSquarePlus } from 'react-icons/fa6';
import { FiEdit } from 'react-icons/fi';
import { RiDeleteBinLine } from 'react-icons/ri';
import { useGlobalCtx } from '@/contexts/global_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { IAccount } from '@/interfaces/accounting_account';
import { MessageType } from '@/interfaces/message_modal';
import { useUserCtx } from '@/contexts/user_context';
import { useTranslation } from 'next-i18next';

export enum ActionType {
  FAV_AND_ADD = 'favorite_and_add',
  EDIT_AND_REMOVE = 'edit_and_REMOVE',
}

interface IAccountingTitleTableProps {
  accountingTitleData: IAccount[];
  actionType: ActionType;
}

interface IAccountingTitleRowProps {
  rowData: IAccount;
  actionType: ActionType;
}

const AccountingRow = ({ rowData, actionType }: IAccountingTitleRowProps) => {
  const { t } = useTranslation('common');
  const {
    addAccountTitleModalVisibilityHandler,
    addAccountTitleDataHandler,
    editAccountTitleModalVisibilityHandler,
    editAccountTitleDataHandler,
    messageModalDataHandler,
    messageModalVisibilityHandler,
  } = useGlobalCtx();
  const { selectedCompany } = useUserCtx();
  const { deleteOwnAccountTitle } = useAccountingCtx();
  const { id, code, name } = rowData;

  const codeAndName = `${code} - ${name}`;

  const handleAddAccount = () => {
    addAccountTitleDataHandler(id);
    addAccountTitleModalVisibilityHandler();
  };

  const handleEditAccount = () => {
    editAccountTitleDataHandler(id);
    editAccountTitleModalVisibilityHandler();
  };

  const handleRemove = () => {
    if (!selectedCompany?.id) return;
    messageModalDataHandler({
      title: t('setting:SETTING.REMOVE_ACCOUNTING_TITLE'),
      content: t('setting:SETTING.REMOVE_THIS_ACCOUNTING_TITLE_CHECK'),
      notes: name,
      messageType: MessageType.WARNING,
      submitBtnStr: t('setting:SETTING.REMOVE'),
      submitBtnFunction: () => deleteOwnAccountTitle(selectedCompany.id, id),
      backBtnStr: t('REPORTS_HISTORY_LIST.CANCEL'),
    });
    messageModalVisibilityHandler();
  };

  const actionsDesktop =
    actionType === ActionType.FAV_AND_ADD ? (
      // Info: (20240717 - Julian) Actions for Favorite and Add New Sub
      <div className="flex items-center justify-center gap-x-8px px-4px text-sm font-normal">
        {/* Info: (20240717 - Julian) Add New Sub button */}
        <button
          type="button"
          className="group flex items-center gap-4px text-checkbox-text-secondary"
          onClick={handleAddAccount}
        >
          <FaRegSquarePlus className="text-icon-surface-single-color-primary group-hover:text-input-text-highlight" />
          <p className="text-checkbox-text-secondary group-hover:text-input-text-highlight">
            {t('setting:SETTING.ADD_NEW_SUB')}
          </p>
        </button>
      </div>
    ) : (
      // Info: (20240717 - Julian) Actions for Edit and Remove
      <div className="flex items-center justify-center gap-x-8px px-4px text-sm font-normal">
        {/* Info: (20240717 - Julian) Edit button */}
        <button
          type="button"
          className="group flex items-center gap-4px text-checkbox-text-secondary"
          onClick={handleEditAccount}
        >
          <FiEdit className="text-icon-surface-single-color-primary group-hover:text-input-text-highlight" />
          <p className="text-checkbox-text-secondary group-hover:text-input-text-highlight">
            {t('setting:SETTING.EDIT')}
          </p>
        </button>
        {/* Info: (20240717 - Julian) Remove button */}
        <button
          type="button"
          className="group flex items-center gap-4px text-checkbox-text-secondary"
          onClick={handleRemove}
        >
          <RiDeleteBinLine className="text-icon-surface-single-color-primary group-hover:text-input-text-highlight" />
          <p className="text-checkbox-text-secondary group-hover:text-input-text-highlight">
            {t('setting:SETTING.REMOVE')}
          </p>
        </button>
      </div>
    );

  const actionsMobile =
    actionType === ActionType.FAV_AND_ADD ? (
      // Info: (20240717 - Julian) Actions for Favorite and Add New Sub
      <div className="flex items-center justify-center gap-x-8px px-4px text-sm font-normal">
        {/* Info: (20240717 - Julian) Add New Sub button */}
        <button
          type="button"
          className="flex items-center gap-4px text-icon-surface-single-color-primary hover:text-input-text-highlight"
          onClick={handleAddAccount}
        >
          <FaRegSquarePlus />
        </button>
      </div>
    ) : (
      // Info: (20240717 - Julian) Actions for Edit and Remove
      <div className="flex items-center justify-center gap-x-8px px-4px text-sm font-normal">
        {/* Info: (20240717 - Julian) Edit button */}
        <button
          type="button"
          className="flex items-center gap-4px text-icon-surface-single-color-primary hover:text-input-text-highlight"
          onClick={handleEditAccount}
        >
          <FiEdit />
        </button>
        {/* Info: (20240717 - Julian) Remove button */}
        <button
          type="button"
          className="flex items-center gap-4px text-icon-surface-single-color-primary hover:text-input-text-highlight"
          onClick={handleRemove}
        >
          <RiDeleteBinLine />
        </button>
      </div>
    );

  return (
    <>
      {/* Info: (20240717 - Julian) Desktop Table Row */}
      <div className="hidden lg:table-row">
        <div className="table-cell py-12px">{code}</div>
        <div className="table-cell py-12px">{name}</div>
        <div className="table-cell py-12px">{actionsDesktop}</div>
      </div>
      {/* Info: (20240717 - Julian) Mobile Table Row */}
      <div className="table-row lg:hidden">
        <div className="table-cell px-8px py-12px">
          <div className="flex w-full">
            <p className="w-100px grow space-x-2 overflow-hidden text-ellipsis whitespace-nowrap">
              {codeAndName}
            </p>
          </div>
        </div>
        <div className="table-cell py-12px">{actionsMobile}</div>
      </div>
    </>
  );
};

const AccountingTitleTable = ({ accountingTitleData, actionType }: IAccountingTitleTableProps) => {
  const { t } = useTranslation('common');
  const accountingTableBody = accountingTitleData.map((account) => (
    <AccountingRow key={account.id} rowData={account} actionType={actionType} />
  ));

  return (
    <div className="table w-full border-separate border-spacing-x-8px text-center font-semibold">
      {/* Info: (20240717 - Julian) Table Header */}
      <div className="table-header-group bg-stroke-brand-secondary-moderate text-lg text-text-neutral-invert">
        {/* Info: (20240717 - Julian) Desktop Table Header Row */}
        <div className="hidden lg:table-row">
          <div className="table-cell w-1/10 py-12px">{t('setting:SETTING.CODE')}</div>
          <div className="table-cell w-6/10 py-12px">{t('setting:SETTING.NAME')}</div>
          <div className="table-cell w-3/10 py-12px">{t('REPORTS_HISTORY_LIST.OPERATIONS')}</div>
        </div>
        {/* Info: (20240717 - Julian) Mobile Table Header Row */}
        <div className="table-row lg:hidden">
          <div className="table-cell py-12px">{t('setting:SETTING.CODE_NAME')}</div>
          <div className="table-cell py-12px">{t('setting:SETTING.ACTION')}</div>
        </div>
      </div>
      {/* Info: (20240717 - Julian) Table Body */}
      <div className="table-row-group bg-surface-neutral-surface-lv2 text-sm text-text-neutral-primary">
        {accountingTableBody}
      </div>
    </div>
  );
};

export default AccountingTitleTable;
