import {
  SetStateAction,
  Dispatch,
  useEffect,
  useCallback,
  ChangeEvent,
  KeyboardEvent,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import { useRouter } from 'next/router';
import { AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';
import { RxTrackPrevious, RxTrackNext } from 'react-icons/rx';
import { useTranslation } from 'next-i18next';
import useStateRef from 'react-usestateref';
import { Button } from '@/components/button/button';
import { KEYBOARD_EVENT_CODE } from '@/constants/keyboard_event_code';

export interface IPaginationProps {
  className?: string;
  totalCount?: number;
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  totalPages: number;
  pagePrefix?: string;
  paginationHandler?: (newPage: number) => void;
  isExporting?: boolean;
}

const Pagination = forwardRef(function Pagination(
  {
    className,
    totalCount,
    currentPage,
    setCurrentPage,
    totalPages,
    pagePrefix = 'page',
    paginationHandler,
    isExporting,
  }: IPaginationProps,
  ref
) {
  const { t } = useTranslation(['common']);
  const [, setTargetPage, targetPageRef] = useStateRef<number | string>('');
  const router = useRouter();
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Info: (20240712 - Shirley) 從 URL 獲取初始頁碼
  useEffect(() => {
    const pageFromUrl = Number(router.query[pagePrefix]);
    if (!Number.isNaN(pageFromUrl) && pageFromUrl !== currentPage) {
      setCurrentPage(pageFromUrl);
    }
  }, [router.query, pagePrefix, setCurrentPage]);

  // Info: (20240712 - Shirley) 更新 URL
  const updateUrl = useCallback(
    (newPage: number) => {
      router.push(
        {
          pathname: router.pathname,
          query: { ...router.query, [pagePrefix]: newPage },
        },
        undefined,
        { shallow: true }
      );
    },
    [router, pagePrefix]
  );

  // Info: (20240419 - Julian) 如果位於第一頁，則將第一頁和上一頁的按鈕設為 disabled
  const isFirstPage = currentPage === 1;
  // Info: (20241127 - Liz) 如果位於最後一頁，或者 totalPages 為 0 時，把最後一頁和下一頁的按鈕設為 disabled
  const isLastPage = currentPage === totalPages || totalPages === 0;

  // Info: (20240419 - Julian)  限制輸入的頁數在 1 ~ totalPages 之間
  // Info: (20240712 - Shirley) 用來處理頁數變更邏輯
  const changePage = useCallback(
    (newPage: number) => {
      if (newPage !== currentPage && newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
        setTargetPage(newPage);
        updateUrl(newPage);
        if (paginationHandler) {
          paginationHandler(newPage);
        }
      }
    },
    [currentPage, totalPages, setCurrentPage, updateUrl]
  );

  // Info: (20240712 - Shirley) input 的 onChange 事件處理函數
  const pageChangeHandler = (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;

    // Info: (20250325 - Liz) 允許空值，這樣使用者可以刪除輸入內容
    if (rawValue === '') {
      setTargetPage(rawValue); // Info: (20250325 - Liz)  暫時設為空字串，避免強制變成 1
      return;
    }

    // Info: (20250325 - Liz) 解析數字並限制範圍
    const value = parseInt(rawValue, 10);
    if (!Number.isNaN(value)) {
      setTargetPage(Math.min(Math.max(1, value), totalPages));
    }
  };

  // Info: (20240419 - Julian) 按下 Enter 鍵後，輸入頁數
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === KEYBOARD_EVENT_CODE.ENTER && targetPageRef.current !== currentPage) {
      if (typeof targetPageRef.current === 'number') changePage(targetPageRef.current);
    }
  };

  // Info: (20241023 - Liz) 暴露 resetTargetPage 給父元件(用來重置頁碼)
  useImperativeHandle(ref, () => ({
    resetTargetPage: () => setTargetPage(1),
  }));

  // Info: (20240712 - Shirley) 按鈕處理函數
  const firstPageHandler = () => changePage(1);
  const previousPageHandler = () => changePage(currentPage - 1);
  const nextPageHandler = () => changePage(currentPage + 1);
  const lastPageHandler = () => changePage(totalPages);

  const displayFirstButton = (
    <Button
      type="button"
      onClick={firstPageHandler}
      disabled={isFirstPage}
      variant="secondaryOutline"
      size={'defaultSquare'}
    >
      <RxTrackPrevious size={16} />
    </Button>
  );

  const displayPreviousButton = (
    <Button
      type="button"
      onClick={previousPageHandler}
      disabled={isFirstPage}
      variant="secondaryOutline"
      size={'defaultSquare'}
    >
      <AiOutlineLeft size={16} />
    </Button>
  );

  const displayLastButton = (
    <Button
      type="button"
      onClick={lastPageHandler}
      disabled={isLastPage}
      variant="secondaryOutline"
      size={'defaultSquare'}
    >
      <RxTrackNext size={16} />
    </Button>
  );

  const displayNextButton = (
    <Button
      type="button"
      onClick={nextPageHandler}
      disabled={isLastPage}
      variant="secondaryOutline"
      size={'defaultSquare'}
    >
      <AiOutlineRight size={16} />
    </Button>
  );

  // Info: (20250326 - Liz) 輸入框的 onFocus 和 onBlur 事件處理函數: 用來顯示/隱藏 placeholder
  const onFocus = () => {
    setIsInputFocused(true);
    setTargetPage('');
  };
  const onBlur = () => {
    setIsInputFocused(false);
    setTargetPage(currentPage);
  };

  const displayPageInput = (
    <input
      name="page"
      type="number"
      placeholder={isInputFocused ? '' : `${currentPage}`}
      min={1}
      max={totalPages}
      value={targetPageRef.current}
      onChange={pageChangeHandler}
      onKeyDown={handleKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      className="h-44px w-44px rounded border border-input-stroke-input bg-transparent text-center text-sm font-semibold text-date-picker-text-input-placeholder outline-none placeholder:text-date-picker-text-input-placeholder disabled:border-input-stroke-input"
    />
  );

  return (
    <div className={`${isExporting ? 'pb-4' : ''} flex flex-col items-center gap-2`}>
      <ul className={`flex items-start gap-10px text-input-text-input-hover ${className || ''}`}>
        {/* Info: (20240419 - Julian) 最前一頁 */}
        <li>{displayFirstButton}</li>
        {/* Info: (20240419 - Julian) 上一頁 */}
        <li>{displayPreviousButton}</li>
        {/* Info: (20240419 - Julian) 手動輸入/顯示當前頁數 */}
        {displayPageInput}
        {/* Info: (20240419 - Julian) 顯示總頁數 */}
        {/* Info: (20240419 - Julian) 下一頁 */}
        <li>{displayNextButton}</li>
        {/* Info: (20240419 - Julian) 最後一頁 */}
        <li>{displayLastButton}</li>
      </ul>
      <p className="text-sm text-text-neutral-tertiary">
        {t('common:COMMON.OF')} {totalPages}
      </p>

      {totalCount !== undefined && (
        <p className="text-sm text-text-neutral-tertiary">
          {t('common:COMMON.TOTAL')}: {totalCount} {t('common:COMMON.DOCUMENT')}
        </p>
      )}
    </div>
  );
});

export default Pagination;
