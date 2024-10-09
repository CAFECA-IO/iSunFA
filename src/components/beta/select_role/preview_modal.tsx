import Image from 'next/image';
import { useState } from 'react';
import { IoCloseOutline, IoEllipse } from 'react-icons/io5';

interface PreviewModalProps {
  togglePreviewModal: () => void;
}

const PreviewModal = ({ togglePreviewModal }: PreviewModalProps) => {
  // ToDo: (20241009 - Liz) 根據 videoIndex 顯示不同影片
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [videoIndex, setVideoIndex] = useState<number>(0);
  const videoIds = ['video1', 'video2', 'video3', 'video4', 'video5'];

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
      <div className="flex w-700px flex-col gap-40px rounded-lg bg-white p-40px">
        <section className="flex items-center justify-between">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-primary">
            Role Function Preview
          </h1>
          <button type="button" onClick={togglePreviewModal}>
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

        {/* // Info: (20241008 - Liz) 切換影片控制按鈕 */}
        <section className="flex justify-center gap-8px p-16px">
          {videoIds.map((id, index) => (
            <button
              key={id}
              type="button"
              onClick={() => setVideoIndex(index)}
              className={
                videoIndex === index ? 'text-carousel-surface-active' : 'text-carousel-surface-mute'
              }
            >
              <IoEllipse size={10} />
            </button>
          ))}
        </section>
      </div>
    </div>
  );
};

export default PreviewModal;
