import Image from 'next/image';
import { IoCloseOutline, IoEllipse } from 'react-icons/io5';

interface PreviewModalProps {
  togglePreviewModal: () => void;
}

const PreviewModal = ({ togglePreviewModal }: PreviewModalProps) => {
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
      <div className="flex w-700px flex-col gap-40px rounded-lg bg-white p-40px">
        <section className="flex items-center justify-between">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-primary">
            Role Function Preview
          </h1>
          <button type="button" onClick={togglePreviewModal} className="">
            <IoCloseOutline size={24} />
          </button>
        </section>

        {/* // Info: (20241008 - Liz) 預覽影片 */}
        <section>
          <Image
            src={'/images/fake_preview_cover.png'}
            alt="fake_preview_cover"
            width={620}
            height={388}
          ></Image>
        </section>

        {/* // Info: (20241008 - Liz) 切換影片控制鈕 */}
        <section className="flex">
          <button type="button" className="text-carousel-surface-active">
            <IoEllipse size={8} />
          </button>
          <IoEllipse size={8} />
          <IoEllipse size={8} />
          <IoEllipse size={8} />
          <IoEllipse size={8} />
        </section>
      </div>
    </div>
  );
};

export default PreviewModal;
