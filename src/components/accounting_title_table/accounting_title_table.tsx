import { useState } from 'react';
import { FaRegStar, FaStar } from 'react-icons/fa';
import { FaRegSquarePlus } from 'react-icons/fa6';
import { FiEdit } from 'react-icons/fi';
import { RiDeleteBinLine } from 'react-icons/ri';
import { useGlobalCtx } from '@/contexts/global_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { IAccount } from '@/interfaces/accounting_account';
import { MessageType } from '@/interfaces/message_modal';
import { useUserCtx } from '@/contexts/user_context';
import { DEFAULT_DISPLAYED_COMPANY_ID } from '@/constants/display';

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

  // ToDo: (20240717 - Julian) favorite status from API
  const [isFavorite, setIsFavorite] = useState(false);

  const codeAndName = `${code} - ${name}`;

  // ToDo: (20240717 - Julian) call API to update favorite status
  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const handleAddAccount = () => {
    addAccountTitleDataHandler(id);
    addAccountTitleModalVisibilityHandler();
  };

  const handleEditAccount = () => {
    editAccountTitleDataHandler(id);
    editAccountTitleModalVisibilityHandler();
  };

  const handleRemove = () => {
    messageModalDataHandler({
      title: 'Remove Accounting title',
      content: 'Are you sure you want to remove this accounting title?',
      notes: name,
      messageType: MessageType.WARNING,
      submitBtnStr: 'Remove',
      submitBtnFunction: () =>
        deleteOwnAccountTitle(selectedCompany?.id ?? DEFAULT_DISPLAYED_COMPANY_ID, id),
      backBtnStr: 'Cancel',
    });
    messageModalVisibilityHandler();
  };

  const displayStar = isFavorite ? (
    <FaStar className="text-icon-surface-single-color-primary group-hover:text-input-text-highlight" />
  ) : (
    <FaRegStar className="text-icon-surface-single-color-primary group-hover:text-input-text-highlight" />
  );

  const actionsDesktop =
    actionType === ActionType.FAV_AND_ADD ? (
      // Info: (20240717 - Julian) Actions for Favorite and Add New Sub
      <div className="flex items-center justify-center gap-x-8px px-4px text-sm font-normal">
        {/* Info: (20240717 - Julian) Favorite button */}
        {/* Info: (20240718 - Julian) 現階段不做 Favorite 功能 */}
        <button
          type="button"
          className="group hidden items-center gap-4px"
          onClick={handleFavorite}
        >
          {displayStar}
          <p className="text-checkbox-text-secondary group-hover:text-input-text-highlight">
            Favorite
          </p>
        </button>
        {/* Info: (20240717 - Julian) Add New Sub button */}
        <button
          type="button"
          className="group flex items-center gap-4px text-checkbox-text-secondary"
          onClick={handleAddAccount}
        >
          <FaRegSquarePlus className="text-icon-surface-single-color-primary group-hover:text-input-text-highlight" />
          <p className="text-checkbox-text-secondary group-hover:text-input-text-highlight">
            Add New Sub
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
          <p className="text-checkbox-text-secondary group-hover:text-input-text-highlight">Edit</p>
        </button>
        {/* Info: (20240717 - Julian) Remove button */}
        <button
          type="button"
          className="group flex items-center gap-4px text-checkbox-text-secondary"
          onClick={handleRemove}
        >
          <RiDeleteBinLine className="text-icon-surface-single-color-primary group-hover:text-input-text-highlight" />
          <p className="text-checkbox-text-secondary group-hover:text-input-text-highlight">
            Remove
          </p>
        </button>
      </div>
    );

  const actionsMobile =
    actionType === ActionType.FAV_AND_ADD ? (
      // Info: (20240717 - Julian) Actions for Favorite and Add New Sub
      <div className="flex items-center justify-center gap-x-8px px-4px text-sm font-normal">
        {/* Info: (20240717 - Julian) Favorite button */}
        {/* Info: (20240718 - Julian) 現階段不做 Favorite 功能 */}
        <button
          type="button"
          className="hidden items-center gap-4px text-icon-surface-single-color-primary hover:text-input-text-highlight"
          onClick={handleFavorite}
        >
          {displayStar}
        </button>
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
  const accountingTableBody = accountingTitleData.map((account) => (
    <AccountingRow key={account.id} rowData={account} actionType={actionType} />
  ));

  return (
    <div className="table w-full border-separate border-spacing-x-8px text-center font-semibold">
      {/* Info: (20240717 - Julian) Table Header */}
      <div className="table-header-group bg-stroke-brand-secondary-moderate text-lg text-text-neutral-invert">
        {/* Info: (20240717 - Julian) Desktop Table Header Row */}
        <div className="hidden lg:table-row">
          <div className="table-cell w-1/10 py-12px">Code</div>
          <div className="table-cell w-6/10 py-12px">Name</div>
          <div className="table-cell w-3/10 py-12px">Operations</div>
        </div>
        {/* Info: (20240717 - Julian) Mobile Table Header Row */}
        <div className="table-row lg:hidden">
          <div className="table-cell py-12px">Code & Name</div>
          <div className="table-cell py-12px">Action</div>
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
