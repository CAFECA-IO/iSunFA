import { useEffect } from 'react';

const RefreshParentPage = () => {
  const handleCloseAndRefresh = () => {
    if (window.opener) {
      // Info: (20250119 - Luphia) 重新整理父頁面（付款頁面）
      window.opener.location.reload();
    }
    // Info: (20250119 - Luphia) 關閉此分頁
    window.close();
  };

  useEffect(() => {
    // Info: (20250119 - Luphia) 在頁面載入完成後立即執行自動刷新
    handleCloseAndRefresh();
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h1>重新整理付款頁面</h1>
      <p>若畫面無回應請點擊下方按鈕以更新付款頁面並關閉此頁面。</p>
      <button
        type="button"
        onClick={handleCloseAndRefresh}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
        }}
      >
        更新並關閉
      </button>
    </div>
  );
};

export default RefreshParentPage;
