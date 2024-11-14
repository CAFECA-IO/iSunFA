import React, { useState } from 'react';
import { CounterpartyType } from '@/constants/counterparty';
import { ICounterparty } from '@/interfaces/counterparty';
import Image from 'next/image';
import { FiEdit } from 'react-icons/fi';
import EditCounterPartyModal from '@/components/counterparty/edit_counterparty_modal';

interface ICounterpartyItemProps {
  counterparty: ICounterparty; // Info: (20241106 - Anna) 符合 ICounterparty 資料格式
  handleSave: (data: { name: string; taxId: string; type: CounterpartyType; note: string }) => void; // 🌟 新增 handleSave 作為屬性
}

const CounterpartyItem = React.memo(({ counterparty, handleSave }: ICounterpartyItemProps) => {
  // 🌟 添加 handleSave 解構
  // eslint-disable-next-line no-console
  console.log('Rendering CounterpartyItem with data:', counterparty);
  const { name, type, note, taxId, id: counterpartyId } = counterparty; // Info: (20241110 - Anna) 使用符合 ICounterparty 的屬性名稱，將 id 重命名為 counterpartyId

  // Info: (20241108 - Anna) 添加狀態來控制彈窗的開關
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Info: (20241108 - Anna) 定義打開和關閉編輯彈窗的處理函數
  const openEditModal = () => setIsEditModalOpen(true);
  const closeEditModal = () => setIsEditModalOpen(false);

  const displayedName = (
    <p className="flex h-full items-center justify-center px-1 font-normal text-neutral-600">
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
      <div className="relative mx-auto flex w-100px items-center gap-8px rounded-full bg-navy-blue-500 px-8px py-4px">
        <Image src="/icons/client.png" alt="client" width={16} height={16} />
        <p className="text-sm text-neutral-25">{type}</p>
      </div>
    ) : type === CounterpartyType.SUPPLIER ? (
      <div className="relative mx-auto flex w-100px items-center gap-4px rounded-full bg-orange-500 px-8px py-4px">
        <Image src="/icons/supplier.png" alt="supplier" width={16} height={16} />
        <p className="text-sm text-neutral-25">{type}</p>
      </div>
    ) : (
      <div className="relative mx-auto flex w-100px items-center gap-12px rounded-full bg-navy-blue-100 px-8px py-4px">
        <Image src="/icons/both.png" alt="both" width={16} height={16} />
        <p className="text-sm text-navy-blue-600">{type}</p>
      </div>
    );

  const displayedNote = (
    <p className="flex h-full items-center justify-center px-1 font-normal text-neutral-600">
      {note}
    </p>
  );

  return (
    <div className="table-row font-medium hover:cursor-pointer hover:bg-surface-brand-primary-10">
      {/* Info: (20241106 - Anna) Partner’s Name */}
      <div className="table-cell text-center align-middle">{displayedName}</div>

      {/* Info: (20241106 - Anna) TaxID */}
      <div className="table-cell text-center align-middle">{displayedTaxID}</div>

      {/* Info: (20241106 - Anna) Partner’s Type */}
      <div className="table-cell py-8px text-right align-middle">{displayedType}</div>

      {/* Info: (20241106 - Anna) Note */}
      <div className="table-cell text-center align-middle">{displayedNote}</div>

      {/* Info: (20241106 - Anna) Action */}
      <div className="table-cell text-center align-middle">
        <div className="flex items-center justify-center">
          <FiEdit size={20} onClick={openEditModal} className="cursor-pointer" />
        </div>
      </div>

      {/* Info: (20241108 - Anna) 根據 isEditModalOpen 狀態顯示彈窗 */}
      {isEditModalOpen && (
        <EditCounterPartyModal
          onClose={closeEditModal}
          onSave={(data) => {
            // eslint-disable-next-line no-console
            console.log('Saved data:', data);
            closeEditModal();
            handleSave(data); // 將更新資料傳遞給父組件
          }}
          name={name}
          taxId={taxId}
          note={note}
          counterpartyId={counterpartyId}
          type={type as CounterpartyType} // 使用強制轉換
        />
      )}
    </div>
  );
});

export default CounterpartyItem;
