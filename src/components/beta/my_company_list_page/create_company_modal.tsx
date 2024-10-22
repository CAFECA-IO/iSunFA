import { IoCloseOutline } from 'react-icons/io5';

interface CreateCompanyModalProps {
  toggleModal: () => void;
}

const CreateCompanyModal = ({ toggleModal }: CreateCompanyModalProps) => {
  return (
    <main className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
      <div className="flex w-400px flex-col rounded-lg bg-surface-neutral-surface-lv2">
        <section className="flex items-center justify-between border-2 border-lime-400 py-16px pl-40px pr-20px">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-secondary">
            Create New Company
          </h1>
          <button type="button" onClick={toggleModal}>
            <IoCloseOutline size={24} />
          </button>
        </section>

        <section className="flex flex-col gap-24px px-40px py-16px">
          <div className="flex flex-col gap-8px">
            <p>Company Name</p>
            <input
              type="text"
              placeholder="Enter name"
              className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none"
            />
          </div>

          <div className="flex flex-col gap-8px">
            <p>Business Tax ID Number</p>
            <input
              type="text"
              placeholder="Enter number"
              className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none"
            />
          </div>

          <div className="flex flex-col gap-8px">
            <p>Work Tag</p>

            <input
              type="text"
              placeholder="Choose Work Tag"
              className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none"
            />
          </div>
        </section>

        <section className="flex justify-end px-20px py-16px">
          <button type="button">Cancel</button>
          <button type="button">Submit</button>
        </section>
      </div>
    </main>
  );
};

export default CreateCompanyModal;
