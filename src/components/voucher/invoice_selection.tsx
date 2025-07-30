import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Button } from '@/components/button/button';
import { AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';
import { FaPlus } from 'react-icons/fa6';
import Image from 'next/image';
import { IInvoiceRC2UI } from '@/interfaces/invoice_rc2';
import InvoiceSelectorThumbnail from '@/components/voucher/invoice_selector_thumbnail';

interface InvoiceSelectionProps {
  selectedInvoices: IInvoiceRC2UI[];
  isSelectable: boolean;
  isDeletable: boolean;
  setOpenModal?: () => void;
  className?: string;
  onDelete?: (id: number) => void;
}

const InvoiceSelection: React.FC<InvoiceSelectionProps> = ({
  selectedInvoices,
  isSelectable,
  isDeletable,
  setOpenModal,
  className = '',
  onDelete,
}: InvoiceSelectionProps) => {
  const { t } = useTranslation(['certificate', 'common']);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [maxWidth, setMaxWidth] = useState<number>(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Info: (20240927 - tzuhan) 更新左右滾動按鈕狀態
  const updateScrollButtonsState = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth);
    }
  };

  useEffect(() => {
    // Info: (20240927 - tzuhan) 使用 ResizeObserver 監聽容器大小變化
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

    // Info: (20240927 - tzuhan) 監聽滾動位置改變以決定按鈕的啟用狀態
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

    // Info: (20240927 - tzuhan) 清除事件和 observer
    return () => {
      if (scrollContainerRef.current) {
        resizeObserver.unobserve(scrollContainerRef.current);
        scrollContainerRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, [scrollContainerRef, containerRef, selectedInvoices]);

  // Info: (20240927 - tzuhan) 處理左右滾動
  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { scrollLeft } = scrollContainerRef.current;
      const scrollAmount = maxWidth - 64; // Info: (20240927 - tzuhan) 每次滾動的距離
      const newScrollPosition =
        direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
      scrollContainerRef.current.scrollTo({ left: newScrollPosition, behavior: 'smooth' });
    }
  };

  return (
    <div className={`${className} w-full items-center`} ref={containerRef}>
      <div
        className={`flex h-56 w-full flex-col ${isSelectable ? 'justify-start' : 'justify-center'} overflow-hidden rounded-md border border-stroke-neutral-quaternary bg-surface-neutral-surface-lv1 px-8 pt-5 shadow-inset-lg`}
        style={{
          maxWidth: `${maxWidth}px`,
        }}
      >
        <div className="flex h-full items-start overflow-x-auto" ref={scrollContainerRef}>
          {selectedInvoices.length > 0 ? (
            selectedInvoices.map((certificate) => (
              <InvoiceSelectorThumbnail
                key={certificate.id}
                invoice={certificate}
                isSelected={false}
                isSelectable={false}
                isDeletable={isDeletable}
                onDelete={onDelete}
              />
            ))
          ) : (
            <div
              className={`flex h-full w-full flex-col items-center justify-center ${isSelectable ? 'hidden' : ''}`}
            >
              <Image src="/elements/empty_box.svg" alt="empty" width={32} height={32} />
              <div className="text-sm text-text-neutral-mute">{t('certificate:COMMON.EMPTY')}</div>
            </div>
          )}
          {isSelectable && (
            <div className="group">
              <button
                type="button"
                className="mx-4 my-2 flex h-140px w-80px items-center justify-center rounded-xs border border-dashed border-stroke-neutral-tertiary p-2 text-white group-hover:border-stroke-brand-primary"
                onClick={setOpenModal}
              >
                <FaPlus
                  className="text-stroke-neutral-tertiary group-hover:text-stroke-brand-primary"
                  size={24}
                />
                {/* <Image
                src="/elements/plus.svg"
                alt="plus"
                width={24}
                height={24}
                className="text-stroke-neutral-tertiary group-hover:text-stroke-brand-primary" // Info: (20240927 - tzuhan) shadow-crossBtn 沒有辦法符合設計稿
              /> */}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-lv-3 w-full text-center text-sm font-medium text-text-neutral-tertiary">
        <p>
          {isSelectable ? t('certificate:COMMON.UPLOADED') : t('certificate:COMMON.UPLOADED')}{' '}
          {selectedInvoices.length} {t('certificate:COMMON.CERTIFICATES')}
        </p>
        <div className="mt-lv-4 flex items-center justify-center space-x-2">
          <Button
            type="button"
            onClick={() => handleScroll('left')}
            variant="secondaryOutline"
            disabled={!canScrollLeft}
            size={'defaultSquare'}
          >
            <AiOutlineLeft size={16} />
          </Button>
          <Button
            type="button"
            onClick={() => handleScroll('right')}
            variant="secondaryOutline"
            disabled={!canScrollRight}
            size={'defaultSquare'}
          >
            <AiOutlineRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceSelection;
