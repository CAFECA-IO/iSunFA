import { IAccountBookWithTeam } from '@/interfaces/account_book';
import { Dispatch, SetStateAction } from 'react';
import { IoCloseOutline } from 'react-icons/io5';

interface EditInfoModalProps {
  accountBookToEditInfo: IAccountBookWithTeam;
  setAccountBookToEditInfo: Dispatch<SetStateAction<IAccountBookWithTeam | undefined>>;
  setRefreshKey?: Dispatch<SetStateAction<number>>;
}

const EditInfoModal = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accountBookToEditInfo,
  setAccountBookToEditInfo,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setRefreshKey,
}: EditInfoModalProps) => {
  const closeEditInfoModal = () => {
    setAccountBookToEditInfo(undefined);
  };
  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="flex w-400px flex-col rounded-lg bg-surface-neutral-surface-lv2">
        <section className="flex items-center justify-between py-16px pl-40px pr-20px">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-secondary">
            Change Company Name
          </h1>
          <button type="button" onClick={closeEditInfoModal}>
            <IoCloseOutline size={24} />
          </button>
        </section>
      </div>
    </main>
  );
};

export default EditInfoModal;
