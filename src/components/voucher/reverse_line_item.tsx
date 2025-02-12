import React from 'react';
import { IReverseItemUI } from '@/interfaces/line_item';
import { FaMinus } from 'react-icons/fa6';
import { FiEdit } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';

interface IReverseLineItemProps {
  reverseItem: IReverseItemUI;
  addHandler: () => void;
  removeHandler: () => void;
}

const ReverseLineItem: React.FC<IReverseLineItemProps> = ({
  reverseItem,
  addHandler,
  removeHandler,
}) => {
  const { t } = useTranslation('journal');
  const { voucherNo, account, description, reverseAmount } = reverseItem;
  return (
    <div className="col-start-1 col-end-13 flex items-center justify-between gap-4px font-medium text-text-neutral-invert">
      <button
        type="button"
        className="p-10px text-button-text-primary hover:text-button-text-primary-hover"
        onClick={removeHandler}
      >
        <FaMinus />
      </button>
      <div className="flex flex-1 items-center gap-20px">
        <div>{voucherNo}</div>
        <div>
          {account?.code} - {account?.name}
        </div>
        <div>{description}</div>
      </div>
      <div className="flex items-center gap-4px">
        <div>
          {t('journal:VOUCHER.REVERSE')}: {reverseAmount}
        </div>
        <button
          type="button"
          className="p-10px text-button-text-primary hover:text-button-text-primary-hover"
          onClick={addHandler}
        >
          <FiEdit />
        </button>
      </div>
    </div>
  );
};

export default ReverseLineItem;
