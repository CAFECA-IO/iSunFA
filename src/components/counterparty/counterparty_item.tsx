import React from 'react';
import { CounterpartyType } from '@/constants/counterparty';
import type { ICounterPartyEntity } from 'src/interfaces/counterparty';
import Image from 'next/image';
import { FiEdit } from 'react-icons/fi';

interface ICounterpartyItemProps {
  counterparty: ICounterPartyEntity; // Info: (20241106 - Anna) 符合 ICounterPartyEntity 資料格式
}

const CounterpartyItem = React.memo(({ counterparty }: ICounterpartyItemProps) => {
  const { name, type, note, taxId } = counterparty; // Info: (20241106 - Anna) 使用符合 ICounterPartyEntity 的屬性名稱

  const displayedName = (
    <p className="flex h-full items-center justify-center px-1 font-normal text-text-neutral-tertiary">
      {name}
    </p>
  );

  const displayedTaxID = (
    <p className="flex h-full items-center justify-center px-1 font-normal text-text-neutral-tertiary">
      {taxId}
    </p>
  );

  const displayedType =
    // Info: (20241106 - Anna) 使用 CounterpartyType 來判斷
    type === CounterpartyType.CLIENT ? (
      <div className="relative mx-auto flex w-90px items-center gap-4px rounded-full bg-badge-surface-soft-error px-8px py-4px">
        <Image src="/icons/client.png" alt="client" width={16} height={16} />
        <p className="text-sm text-text-state-error-solid">{type}</p>
      </div>
    ) : type === CounterpartyType.SUPPLIER ? (
      <div className="relative mx-auto flex w-90px items-center gap-4px rounded-full bg-badge-surface-soft-success px-8px py-4px">
        <Image src="/icons/supplier.png" alt="supplier" width={16} height={16} />
        <p className="text-sm text-text-state-success-solid">{type}</p>
      </div>
    ) : (
      <div className="relative mx-auto flex w-90px items-center gap-4px rounded-full bg-badge-surface-soft-secondary px-8px py-4px">
        <Image src="/icons/both.png" alt="both" width={16} height={16} />
        <p className="text-sm text-badge-text-secondary-solid">{type}</p>
      </div>
    );

  const displayedNote = (
    <p className="flex h-full items-center justify-start px-1 font-normal text-text-neutral-tertiary">
      {note}
    </p>
  );

  return (
    <div className="table-row font-medium hover:cursor-pointer hover:bg-surface-brand-primary-10">
      {/* Info: (20241106 - Anna) Partner’s Name */}
      <div className="table-cell text-center">{displayedName}</div>

      {/* Info: (20241106 - Anna) TaxID */}
      <div className="table-cell text-center align-middle">{displayedTaxID}</div>

      {/* Info: (20241106 - Anna) Partner’s Type */}
      <div className="table-cell py-8px text-right align-middle">{displayedType}</div>

      {/* Info: (20241106 - Anna) Note */}
      <div className="table-cell py-8px text-right align-middle">{displayedNote}</div>

      {/* Info: (20241106 - Anna) Action */}
      <div className="table-cell py-8px text-center align-middle">
        <FiEdit size={20} />
      </div>
    </div>
  );
});

export default CounterpartyItem;
