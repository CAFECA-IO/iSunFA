import React, { useState } from 'react';
import { toast } from 'react-toastify';
// import { useSWRConfig } from 'swr';

interface Props {
  teamId: number | string;
  closeToast: () => void;
}

/**
 * 顯示在 FREE_TRIAL_EXPIRED Toast 內的按鈕
 */
export const ExtendTrialToastButton: React.FC<Props> = ({ teamId, closeToast }) => {
  const [isLoading, setIsLoading] = useState(false);
  // const { mutate } = useSWRConfig();

  const handleExtendTrial = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v2/team/${teamId}/subscription/extend-trial`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '延長試用失敗，請稍後再試。');
      }

      // Info: (20251105 - Tzuhan) 成功！
      toast.success('試用期已成功延長 1 個月！');

      // Info: (20251105 - Tzuhan) 關閉目前的錯誤 toast
      closeToast();
      /* Info: (20251106 - Tzuhan)
       * --- 替代方案 ---
       * 這是最簡單且保證 UI 同步的方式
       * 它會重新載入當前頁面，
       * 頁面重新載入時，APIHandler 會重新抓取資料
       * 屆時就會抓到最新的訂閱狀態
       */
      window.location.reload();
    } catch (error) {
      toast.error((error as Error).message || '延長失敗');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '10px' }}>
      <button
        onClick={handleExtendTrial}
        disabled={isLoading}
        style={{
          padding: '8px 12px',
        }}
      >
        {isLoading ? '處理中...' : '申請延長試用1個月'}
      </button>
    </div>
  );
};
