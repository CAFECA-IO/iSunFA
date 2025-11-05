import React, { useState } from 'react';
import { toast } from 'react-toastify';

interface Props {
  teamId: number | string;
  closeToast: () => void;
}

export const ExtendTrialToastButton: React.FC<Props> = ({ teamId, closeToast }) => {
  const [isLoading, setIsLoading] = useState(false);

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

      // 成功！
      toast.success('試用期已成功延長 1 個月！');

      // 關閉目前的錯誤 toast
      closeToast();
    } catch (error) {
      toast.error((error as Error).message || '延長失敗');
      setIsLoading(false);
    }
    // 不管成功或失敗，loading 都結束了 (成功時 Toast 已關閉)
  };

  return (
    <div style={{ marginTop: '10px' }}>
      <button onClick={handleExtendTrial} disabled={isLoading}>
        {isLoading ? '處理中...' : '申請延長試用1個月'}
      </button>
    </div>
  );
};
