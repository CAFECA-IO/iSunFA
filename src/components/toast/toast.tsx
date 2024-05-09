import { ToastContainer } from 'react-toastify';
import { RxCross2 } from 'react-icons/rx';

const Toast = () => {
  const closeButton = () => <RxCross2 size={16} className="text-secondaryBlue" />;

  return (
    <ToastContainer
      hideProgressBar
      newestOnTop
      rtl={false}
      pauseOnFocusLoss
      pauseOnHover
      theme="light"
      limit={5}
      closeButton={closeButton}
      className="mt-70px"
      style={{ width: '500px' }}
    />
  );
};

export default Toast;
