import Image from 'next/image';
import { Dispatch, SetStateAction } from 'react';
import { useUserCtx } from '@/contexts/user_context';
import { IAccountBookWithTeam } from '@/interfaces/account_book';

interface MyAccountBookItemProps {
  accountBook: IAccountBookWithTeam;
  setAccountBookToSelect: Dispatch<SetStateAction<IAccountBookWithTeam | undefined>>;
  isDisabled: boolean;
  dataIndex: number;
}

const MyAccountBookItem = ({
  accountBook,
  setAccountBookToSelect,
  isDisabled,
  dataIndex,
}: MyAccountBookItemProps) => {
  const { connectedAccountBook } = useUserCtx();
  const isCompanySelected = accountBook.id === connectedAccountBook?.id;

  const openMessageModal = () => {
    if (!isDisabled && !isCompanySelected) {
      setAccountBookToSelect(accountBook);
    }
  };

  return (
    <button
      data-index={dataIndex}
      key={accountBook.id}
      type="button"
      onClick={openMessageModal}
      disabled={isCompanySelected || isDisabled}
      className={`flex h-120px w-120px flex-none flex-col items-center justify-center gap-8px overflow-hidden rounded-sm border px-8px py-12px ${isCompanySelected ? 'border-stroke-neutral-quaternary bg-surface-brand-primary-30' : ''} ${isDisabled ? 'border-stroke-neutral-quaternary bg-surface-neutral-main-background opacity-70' : ''} ${!isCompanySelected && !isDisabled ? 'border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2 hover:bg-surface-brand-primary-10' : ''} `}
    >
      <Image
        src={accountBook.imageId}
        alt={accountBook.name}
        width={60}
        height={60}
        className="h-60px w-60px rounded-sm object-contain"
      />
      <p className="w-full truncate text-text-neutral-primary">{accountBook.name}</p>
    </button>
  );
};

export default MyAccountBookItem;
