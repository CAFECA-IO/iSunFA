import { ToastContainer } from 'react-toastify';

const Toast = () => {
  return (
    <ToastContainer
      hideProgressBar
      // newestOnTop // Info: 打開的話右下角的 toast 會在其他 toast 改變的時候跳動 (20240517 - Shirley)
      rtl={false}
      pauseOnFocusLoss
      pauseOnHover
      theme="light"
      limit={5}
      style={{ width: 'max-content', marginTop: '80px', pointerEvents: 'none' }}
    />
  );
};

export default Toast;
