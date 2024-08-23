import { ToastContainer } from 'react-toastify';

const Toast = () => {
  return (
    <ToastContainer
      hideProgressBar
      // newestOnTop // Info: (20240517 - Shirley) 打開的話右下角的 toast 會在其他 toast 改變的時候跳動
      rtl={false}
      pauseOnFocusLoss
      pauseOnHover
      theme="light"
      limit={5}
      className={'toast-container'} // Info: (20240725 - Liz) 使用自定義樣式調整 toast container
    />
  );
};

export default Toast;
