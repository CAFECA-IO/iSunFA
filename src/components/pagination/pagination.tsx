import {
  SetStateAction,
  Dispatch,
  useEffect,
  useCallback,
  ChangeEvent,
  KeyboardEvent,
} from 'react';
import { useRouter } from 'next/router';
import { AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';
import { RxTrackPrevious, RxTrackNext } from 'react-icons/rx';
import { useTranslation } from 'next-i18next';
import useStateRef from 'react-usestateref';

export interface IPaginationProps {
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  totalPages: number;
  pagePrefix?: string;
}

const Pagination = ({
  currentPage,
  setCurrentPage,
  totalPages,
  pagePrefix = 'page',
}: IPaginationProps) => {
  const { t } = useTranslation('common');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [targetPage, setTargetPage, targetPageRef] = useStateRef<number>(currentPage);
  const router = useRouter();

  /* Deprecated: (20240716 - Shirley)
  // useEffect(() => {
  //   // Info: (20240419 - Julian) 更新當前頁數到 URL
  //   const handleUrlChange = () => {
  //     const url = new URL(window.location.href);
  //     const pageParam = url.searchParams.get(pagePrefix);
  //     const page = pageParam ? parseInt(pageParam, 10) : 1;
  //     if (!Number.isNaN(page) && page !== currentPage) {
  //       setCurrentPage(page);
  //     }
  //   };

  //   window.addEventListener('popstate', handleUrlChange);
  //   return () => window.removeEventListener('popstate', handleUrlChange);
  // }, [currentPage, setCurrentPage, pagePrefix]);

  // // const updateUrl = useCallback(
  // //   (newPage: number) => {
  // //     const queryKey = pagePrefix;
  // //     const newQuery = { ...router.query, [queryKey]: newPage.toString() };
  // //     router.replace({
  // //       pathname: router.pathname,
  // //       query: newQuery,
  // //     });
  // //   },
  // //   [pagePrefix]
  // // );

  // // 更新 URL
  // const updateUrl = useCallback(
  //   (newPage: number) => {
  //     router.push(
  //       {
  //         pathname: router.pathname,
  //         query: { ...router.query, [pagePrefix]: newPage },
  //       },
  //       undefined,
  //       { shallow: true }
  //     );
  //   },
  //   [router, pagePrefix]
  // );

  // // Info: (20240419 - Julian) 當 currentPage 改變時，更新目標頁碼和 URL
  // useEffect(() => {
  //   setTargetPage(currentPage);
  //   updateUrl(currentPage);
  // }, [currentPage, setTargetPage, updateUrl]);
  */

  // Info: 從 URL 獲取初始頁碼 (20240712 - Shirley)
  useEffect(() => {
    const pageFromUrl = Number(router.query[pagePrefix]);
    if (!Number.isNaN(pageFromUrl) && pageFromUrl !== currentPage) {
      setCurrentPage(pageFromUrl);
    }
  }, [router.query, pagePrefix, setCurrentPage]);

  // Info: 更新 URL (20240712 - Shirley)
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
  // Info: (20240419 - Julian) 如果位於最後一頁，則將最後一頁和下一頁的按鈕設為 disabled
  const isLastPage = currentPage === totalPages;

  // Info: (20240419 - Julian)  限制輸入的頁數在 1 ~ totalPages 之間
  // Info: 用來處理頁數變更邏輯 (20240712 - Shirley)
  const changePage = useCallback(
    (newPage: number) => {
      if (newPage !== currentPage && newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
        setTargetPage(newPage);
        updateUrl(newPage);
      }
    },
    [currentPage, totalPages, setCurrentPage, updateUrl]
  );

  // Info: input 的 onChange 事件處理函數 (20240712 - Shirley)
  const pageChangeHandler = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Math.max(1, parseInt(e.target.value, 10)), totalPages);
    if (!Number.isNaN(value)) {
      setTargetPage(value);
    }
  };

  // Info: (20240419 - Julian) 按下 Enter 鍵後，輸入頁數
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && targetPageRef.current !== currentPage) {
      changePage(targetPageRef.current);
    }
  };

  // Info: 按鈕處理函數 (20240712 - Shirley)
  const firstPageHandler = () => changePage(1);
  const previousPageHandler = () => changePage(currentPage - 1);
  const nextPageHandler = () => changePage(currentPage + 1);
  const lastPageHandler = () => changePage(totalPages);

  const displayFirstButton = (
    <button
      type="button"
      onClick={firstPageHandler}
      disabled={isFirstPage}
      className="flex h-40px w-40px items-center justify-center rounded border border-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow disabled:border-lightGray3 disabled:text-lightGray3"
    >
      <RxTrackPrevious size={16} />
    </button>
  );

  const displayPreviousButton = (
    <button
      type="button"
      onClick={previousPageHandler}
      disabled={isFirstPage}
      className="flex h-40px w-40px items-center justify-center rounded border border-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow disabled:border-lightGray3 disabled:text-lightGray3"
    >
      <AiOutlineLeft size={16} />
    </button>
  );

  const displayLastButton = (
    <button
      type="button"
      onClick={lastPageHandler}
      disabled={isLastPage}
      className="flex h-40px w-40px items-center justify-center rounded border border-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow disabled:border-lightGray3 disabled:text-lightGray3"
    >
      <RxTrackNext size={16} />
    </button>
  );

  const displayNextButton = (
    <button
      type="button"
      onClick={nextPageHandler}
      disabled={isLastPage}
      className="flex h-40px w-40px items-center justify-center rounded border border-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow disabled:border-lightGray3 disabled:text-lightGray3"
    >
      <AiOutlineRight size={16} />
    </button>
  );

  const displayPageInput = (
    <input
      name="page"
      type="number"
      placeholder={`${currentPage}`}
      min={1}
      max={totalPages}
      value={targetPageRef.current}
      onChange={pageChangeHandler}
      onKeyDown={handleKeyDown}
      className="h-40px w-40px rounded border border-secondaryBlue bg-transparent text-center text-sm font-semibold outline-none placeholder:text-lightGray3 disabled:border-lightGray3"
    />
  );

  return (
    <ul className="flex items-start gap-10px text-secondaryBlue">
      {/* Info: (20240419 - Julian) 最前一頁 */}
      <li>{displayFirstButton}</li>
      {/* Info: (20240419 - Julian) 上一頁 */}
      <li>{displayPreviousButton}</li>
      {/* Info: (20240419 - Julian) 手動輸入/顯示當前頁數 */}
      <li className="flex flex-col items-center">
        {displayPageInput}
        {/* Info: (20240419 - Julian) 顯示總頁數 */}
        <p>
          {t('COMMON.OF')} {totalPages}
        </p>
      </li>
      {/* Info: (20240419 - Julian) 下一頁 */}
      <li>{displayNextButton}</li>
      {/* Info: (20240419 - Julian) 最後一頁 */}
      <li>{displayLastButton}</li>
    </ul>
  );
};

export default Pagination;
