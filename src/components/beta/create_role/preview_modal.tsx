import { useRef, useState } from 'react';
import { IoCloseOutline, IoEllipse } from 'react-icons/io5';
import { useTranslation } from 'next-i18next';
import { RoleName } from '@/constants/role';

const ALL_ROLE_VIDEOS: { role: RoleName; videos: { id: number; url: string }[] }[] = [
  {
    role: RoleName.INDIVIDUAL,
    videos: [
      { id: 0, url: 'https://www.youtube.com/embed/ybzMzaD74gs' },
      { id: 1, url: 'https://www.youtube.com/embed/Nt_HvFha-rA' },
      { id: 2, url: 'https://www.youtube.com/embed/2tuKxQIkh2Q' },
      { id: 3, url: 'https://www.youtube.com/embed/JaMhpQ0CnoU' },
      { id: 4, url: 'https://www.youtube.com/embed/GXoTiXkIZdc' },
    ],
  },
  {
    role: RoleName.ACCOUNTING_FIRMS,
    videos: [
      { id: 0, url: 'https://www.youtube.com/embed/ybzMzaD74gs' },
      { id: 1, url: 'https://www.youtube.com/embed/Nt_HvFha-rA' },
      { id: 2, url: 'https://www.youtube.com/embed/2tuKxQIkh2Q' },
      { id: 3, url: 'https://www.youtube.com/embed/JaMhpQ0CnoU' },
      { id: 4, url: 'https://www.youtube.com/embed/GXoTiXkIZdc' },
    ],
  },
  {
    role: RoleName.ENTERPRISE,
    videos: [
      { id: 0, url: 'https://www.youtube.com/embed/ybzMzaD74gs' },
      { id: 1, url: 'https://www.youtube.com/embed/Nt_HvFha-rA' },
      { id: 2, url: 'https://www.youtube.com/embed/2tuKxQIkh2Q' },
      { id: 3, url: 'https://www.youtube.com/embed/JaMhpQ0CnoU' },
      { id: 4, url: 'https://www.youtube.com/embed/GXoTiXkIZdc' },
    ],
  },
];

interface PreviewModalProps {
  togglePreviewModal: () => void;
  displayedRole: RoleName | undefined; // Info: (20250528 - Liz) 目前畫面顯示的角色
}

const PreviewModal = ({ togglePreviewModal, displayedRole }: PreviewModalProps) => {
  const { t } = useTranslation('dashboard');

  // Info: (20250528 - Liz) 根據角色取得對應的影片
  const videos =
    ALL_ROLE_VIDEOS.find((roleVideos) => roleVideos.role === displayedRole)?.videos ?? [];

  // Info: (20250528 - Liz) 根據 videoIndex 顯示不同影片
  const [videoIndex, setVideoIndex] = useState<number>(0);

  // Info: (20250528 - Liz) 用來記錄觸控起始位置
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;

    if (touchStartX.current !== null && touchEndX.current !== null) {
      const deltaX = touchStartX.current - touchEndX.current;

      // Info: (20250528 - Liz) 設定滑動閾值
      const swipeThreshold = 50;

      if (deltaX > swipeThreshold) {
        // Info: (20250528 - Liz) 向左滑:下一部影片
        setVideoIndex((prev) => Math.min(prev + 1, videos.length - 1));
      } else if (deltaX < -swipeThreshold) {
        // Info: (20250528 - Liz) 向右滑:上一部影片
        setVideoIndex((prev) => Math.max(prev - 1, 0));
      }
    }

    // Info: (20250528 - Liz) 重置觸控位置
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div
        className="flex w-90vw flex-col gap-24px rounded-lg bg-surface-neutral-main-background px-16px py-24px tablet:w-700px tablet:gap-40px tablet:p-40px"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <section className="flex items-center justify-between">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-primary">
            {t('dashboard:CREATE_ROLE_PAGE.ROLE_FUNCTION_PREVIEW')}
          </h1>
          <button type="button" onClick={togglePreviewModal}>
            <IoCloseOutline size={24} />
          </button>
        </section>

        <iframe
          src={videos[videoIndex].url}
          title={`YouTube Video ${videos[videoIndex].id}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="aspect-video rounded-xl"
        ></iframe>

        {/* Info: (20241008 - Liz) 切換影片控制按鈕 (圓點點) */}
        <section className="flex justify-center gap-8px p-16px">
          {videos.map((video, index) => (
            <button
              key={video.id}
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
