import React from 'react';

interface PaginationProps {
  currentPage: number; // Info: (20240919 - tzuhan) 當前頁碼
  totalPages: number; // Info: (20240919 - tzuhan) 總頁數
  onPageChange: (page: number) => void; // Info: (20240919 - tzuhan) 處理頁碼變更的函數
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  // Info: (20240919 - tzuhan) 第一頁與最後一頁按鈕的可用狀態
  const canGoFirst = currentPage > 1;
  const canGoLast = currentPage < totalPages;

  return (
    <div className="flex items-center space-x-2 rounded-lg bg-white p-4">
      {/* Info: (20240919 - tzuhan) 第一頁 */}
      <button
        type="button"
        className={`rounded border p-2 ${canGoFirst ? 'hover:bg-gray-200' : 'cursor-not-allowed opacity-50'}`}
        onClick={() => canGoFirst && onPageChange(1)}
        disabled={!canGoFirst}
      >
        ⏮️
      </button>

      {/* Info: (20240919 - tzuhan) 上一頁 */}
      <button
        type="button"
        className={`rounded border p-2 ${canGoFirst ? 'hover:bg-gray-200' : 'cursor-not-allowed opacity-50'}`}
        onClick={() => canGoFirst && onPageChange(currentPage - 1)}
        disabled={!canGoFirst}
      >
        ⬅️
      </button>

      {/* Info: (20240919 - tzuhan) 當前頁碼 */}
      <span className="p-2 text-gray-700">
        {currentPage} <span className="text-gray-400">of {totalPages}</span>
      </span>

      {/* Info: (20240919 - tzuhan) 下一頁 */}
      <button
        type="button"
        className={`rounded border p-2 ${canGoLast ? 'hover:bg-gray-200' : 'cursor-not-allowed opacity-50'}`}
        onClick={() => canGoLast && onPageChange(currentPage + 1)}
        disabled={!canGoLast}
      >
        ➡️
      </button>

      {/* Info: (20240919 - tzuhan) 最後一頁 */}
      <button
        type="button"
        className={`rounded border p-2 ${canGoLast ? 'hover:bg-gray-200' : 'cursor-not-allowed opacity-50'}`}
        onClick={() => canGoLast && onPageChange(totalPages)}
        disabled={!canGoLast}
      >
        ⏭️
      </button>
    </div>
  );
};

export default Pagination;
