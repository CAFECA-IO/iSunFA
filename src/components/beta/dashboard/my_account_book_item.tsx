import Image from 'next/image';
import { Dispatch, SetStateAction } from 'react';
import { useUserCtx } from '@/contexts/user_context';
import { IAccountBookForUser } from '@/interfaces/account_book';

interface MyAccountBookItemProps {
  companyAndRole: IAccountBookForUser;
  setAccountBookToSelect: Dispatch<SetStateAction<IAccountBookForUser | undefined>>;
  isDisabled: boolean;
  dataIndex: number;
}

const MyAccountBookItem = ({
  companyAndRole,
  setAccountBookToSelect,
  isDisabled,
  dataIndex,
}: MyAccountBookItemProps) => {
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

export default MyAccountBookItem;
