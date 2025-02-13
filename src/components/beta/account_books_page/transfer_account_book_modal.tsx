import { Dispatch, SetStateAction, useState } from 'react';
import { ICompanyAndRole } from '@/interfaces/company';
import { IoCloseOutline } from 'react-icons/io5';

interface TransferAccountBookModalProps {
  accountBookToTransfer: ICompanyAndRole;
  setAccountBookToTransfer: Dispatch<SetStateAction<ICompanyAndRole | undefined>>;
}

const TransferAccountBookModal = ({
  accountBookToTransfer,
  setAccountBookToTransfer,
}: TransferAccountBookModalProps) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [transferToTeamId, setTransferToTeamId] = useState<string>('');

  // Deprecated: (20250213 - Liz)
  // eslint-disable-next-line no-console
  console.log('accountBookToTransfer:', accountBookToTransfer);

  const closeTransferAccountBookModal = () => {
    setAccountBookToTransfer(undefined);
  };

  // ToDo: (20250213 - Liz) 打 API 轉移帳本(原為公司)

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="flex w-400px flex-col rounded-lg bg-surface-neutral-surface-lv2">
        <section className="flex items-center justify-between py-16px pl-40px pr-20px">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-secondary">
            Account Book Transfer
          </h1>
          <button type="button" onClick={closeTransferAccountBookModal}>
            <IoCloseOutline size={24} />
          </button>
        </section>
      </div>
    </main>
  );
};

export default TransferAccountBookModal;
