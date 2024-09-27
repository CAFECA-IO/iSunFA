/* eslint-disable no-console */
import { Button } from '@/components/button/button';
import { AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';
import { FaPlus } from 'react-icons/fa6';
import { ICertificateUI } from '@/interfaces/certificate';
import CertificateSelectorThumbnail from '@/components/certificate/certificate_selector_thumbnail';
import { useEffect, useRef, useState } from 'react';

interface CertificateSelectionProps {
  selectedCertificates: ICertificateUI[];
  isSelectable: boolean;
  isDeletable: boolean;
  setOpenModal: () => void;
}

const CertificateSelection: React.FC<CertificateSelectionProps> = ({
  selectedCertificates,
  isSelectable,
  isDeletable,
  setOpenModal,
}: CertificateSelectionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [maxWidth, setMaxWidth] = useState<number>(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // 更新左右滾動按鈕狀態
  const updateScrollButtonsState = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      console.log(scrollLeft, scrollWidth, clientWidth);
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth);
    }
  };

  useEffect(() => {
    // 使用 ResizeObserver 監聽容器大小變化
    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        setMaxWidth(entry.contentRect.width);
      });
      updateScrollButtonsState();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    if (scrollContainerRef.current) {
      scrollContainerRef.current.addEventListener('scroll', updateScrollButtonsState);
    }

    // 監聽滾動位置改變以決定按鈕的啟用狀態
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth);
      }
    };

    if (scrollContainerRef.current) {
      scrollContainerRef.current.addEventListener('scroll', handleScroll);
    }

    updateScrollButtonsState();

    // 清除事件和 observer
    return () => {
      if (scrollContainerRef.current) {
        resizeObserver.unobserve(scrollContainerRef.current);
        scrollContainerRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, [scrollContainerRef, containerRef, selectedCertificates]);

  // 處理左右滾動
  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { scrollLeft } = scrollContainerRef.current;
      const scrollAmount = maxWidth - 64; // 每次滾動的距離
      const newScrollPosition =
        direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
      scrollContainerRef.current.scrollTo({ left: newScrollPosition, behavior: 'smooth' });
    }
  };

  return (
    <div className="my-8 w-full flex-col items-center" ref={containerRef}>
      <div
        className="flex h-56 w-full flex-col justify-start overflow-hidden rounded-md border border-stroke-neutral-quaternary px-8 pt-6 shadow-inset-lg"
        style={{
          maxWidth: `${maxWidth}px`,
        }}
      >
        <div className="flex h-full items-start overflow-x-auto" ref={scrollContainerRef}>
          {selectedCertificates.map((certificate) => (
            <CertificateSelectorThumbnail
              key={certificate.id}
              certificate={certificate}
              handleSelect={() => {}}
              isSelected={false}
              isSelectable={false}
              isDeletable={isDeletable}
            />
          ))}
          {isSelectable && (
            <div>
              <button
                type="button"
                className="mx-4 my-2 flex h-140px w-80px items-center justify-center rounded-xs border border-dashed border-stroke-neutral-tertiary p-2 text-white"
                onClick={setOpenModal}
              >
                <FaPlus size={24} className="text-stroke-neutral-tertiary" />
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 w-full text-center">
        <p className="text-text-neutral-tertiary">
          {isSelectable ? 'Uploaded' : 'Total'} {selectedCertificates.length} certificates
        </p>
        <div className="mt-2 flex items-center justify-center space-x-2">
          <Button
            type="button"
            onClick={() => handleScroll('left')}
            variant="secondaryOutline"
            disabled={!canScrollLeft}
            className="h-40px w-40px p-0"
          >
            <AiOutlineLeft size={16} />
          </Button>
          <Button
            type="button"
            onClick={() => handleScroll('right')}
            variant="secondaryOutline"
            disabled={!canScrollRight}
            className="h-40px w-40px p-0"
          >
            <AiOutlineRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CertificateSelection;
