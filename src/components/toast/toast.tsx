import { ToastContainer } from 'react-toastify';

const Toast = () => {
  return (
    <ToastContainer
      hideProgressBar
      newestOnTop
      rtl={false}
      pauseOnFocusLoss
      pauseOnHover
      theme="light"
      limit={5}
      style={{ width: 'max-content', marginTop: '80px' }}
    />
  );
};

export default Toast;
