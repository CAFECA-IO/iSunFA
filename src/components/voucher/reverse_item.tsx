import React from 'react';
import { IReverseItemUI } from '@/interfaces/line_item';
import { FaMinus } from 'react-icons/fa6';
import { FiEdit } from 'react-icons/fi';

interface IReverseItemProps {
  reverseItem: IReverseItemUI;
  addHandler: () => void;
  removeHandler: () => void;
}

const ReverseItem: React.FC<IReverseItemProps> = ({ reverseItem, addHandler, removeHandler }) => {
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
        <div>Reverse: {reverseAmount}</div>
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

export default ReverseItem;
