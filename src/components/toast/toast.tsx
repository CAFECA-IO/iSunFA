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
      className="mt-70px"
      style={{ width: '500px' }}
    />
  );
};

export default Toast;
