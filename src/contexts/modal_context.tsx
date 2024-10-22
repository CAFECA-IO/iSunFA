import React, { useState, useContext, createContext, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { IMessageModal, dummyMessageModalData } from '@/interfaces/message_modal';
import { IToastify, ToastPosition, ToastType } from '@/interfaces/toastify';
import { toast as toastify } from 'react-toastify';
import { RxCross2 } from 'react-icons/rx';

interface ModalContextType {
  isConfirmModalVisible: boolean;
  confirmModalVisibilityHandler: () => void;
  isMessageModalVisible: boolean;
  messageModalVisibilityHandler: () => void;
  messageModalData: IMessageModal;
  messageModalDataHandler: (data: IMessageModal) => void;
  toastHandler: (props: IToastify) => void;
  eliminateToast: (id?: string) => void;
  isAddBookmarkModalVisible: boolean;
  addBookmarkModalVisibilityHandler: () => void;
}
const ModalContext = createContext<ModalContextType | undefined>(undefined);
interface ModalProviderProps {
  children: React.ReactNode;
}
export const ModalProvider = ({ children }: ModalProviderProps) => {
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [isMessageModalVisible, setIsMessageModalVisible] = useState(false);
  const [messageModalData, setMessageModalData] = useState<IMessageModal>(dummyMessageModalData);
  const [isAddBookmarkModalVisible, setIsAddBookmarkModalVisible] = useState(false);
  const confirmModalVisibilityHandler = () => {
    setIsConfirmModalVisible(!isConfirmModalVisible);
  };
  const messageModalVisibilityHandler = () => {
    setIsMessageModalVisible(!isMessageModalVisible);
  };
  const messageModalDataHandler = (data: IMessageModal) => {
    setMessageModalData(data);
  };
  const toastHandler = useCallback((props: IToastify) => {
    const {
      // Info: (20240909 - Anna) TypeScript 本身已經有型別檢查系統。因此 ESLint 不需要針對 TypeScript 檔案強制使用 prop-types。因此這裡的ESLint註解不做移除。
      // eslint-disable-next-line react/prop-types
      id,
      // eslint-disable-next-line react/prop-types
      type,
      // eslint-disable-next-line react/prop-types
      content,
      // eslint-disable-next-line react/prop-types
      closeable,
      // eslint-disable-next-line react/prop-types
      autoClose: isAutoClose,
      // eslint-disable-next-line react/prop-types
      position: toastPosition,
      // eslint-disable-next-line react/prop-types
      onClose = () => {},
      // eslint-disable-next-line react/prop-types
      onOpen = () => {},
    } = props;

    const bodyStyle =
      'before:absolute before:h-100vh before:w-10px before:top-0 before:left-0 flex items-center gap-12px px-14px md:w-max w-100vw md:scale-100 scale-75 text-sm font-barlow pointer-events-auto';

    const toastId = id;
    const position = toastPosition ?? ToastPosition.TOP_CENTER; // Info:(20240513 - Julian) default position 'top-center'

    // Info:(20240513 - Julian) 如果 closeable 為 false，則 autoClose、closeOnClick、draggable 都會被設為 false
    const autoClose = closeable ? (isAutoClose ?? 5000) : false; // Info:(20240513 - Julian) default autoClose 5000ms

    const closeOnClick = closeable; // Info:(20240513 - Julian) default closeOnClick true
    const draggable = closeable; // Info:(20240513 - Julian) default draggable true
    const closeButton = closeable
      ? () => (
          <div className="flex items-center justify-center p-10px">
            <RxCross2 size={16} className="text-button-text-secondary" />
          </div>
        )
      : false;

    switch (type) {
      case ToastType.SUCCESS:
        toastify.success(content, {
          icon: <Image src="/icons/success.svg" alt="success" width={24} height={24} />,
          className: `${bodyStyle} before:bg-alert-surface-surface-success`,
          toastId,
          position,
          autoClose,
          closeOnClick,
          draggable,
          closeButton,
          onClose,
          onOpen,
        });
        break;
      case ToastType.ERROR:
        toastify.error(content, {
          icon: <Image src="/icons/error.svg" alt="error" width={24} height={24} />,
          className: `${bodyStyle} before:bg-alert-surface-surface-error`,
          toastId,
          position,
          autoClose,
          closeOnClick,
          draggable,
          closeButton,
          onClose,
          onOpen,
        });
        break;
      case ToastType.WARNING:
        toastify.warning(content, {
          icon: <Image src="/icons/warning.svg" alt="warning" width={24} height={24} />,
          className: `${bodyStyle} before:bg-alert-surface-surface-warning`,
          toastId,
          position,
          autoClose,
          closeOnClick,
          draggable,
          closeButton,
          onClose,
          onOpen,
        });
        break;
      case ToastType.INFO:
        toastify.info(content, {
          icon: <Image src="/icons/info.svg" alt="info" width={24} height={24} />,
          className: `${bodyStyle} before:bg-alert-surface-surface-info`,
          toastId,
          position,
          autoClose,
          closeOnClick,
          draggable,
          closeButton,
          onClose,
          onOpen,
        });
        break;
      default:
        toastify(content);
        break;
    }
  }, []);
  const eliminateToast = (id?: string) => {
    if (id) {
      toastify.dismiss(id);
    } else {
      toastify.dismiss(); // Info:(20240513 - Julian) dismiss all toasts
    }
  };
  const addBookmarkModalVisibilityHandler = () => {
    setIsAddBookmarkModalVisible(!isAddBookmarkModalVisible);
  };
  const value = useMemo(
    () => ({
      isConfirmModalVisible,
      confirmModalVisibilityHandler,
      isMessageModalVisible,
      messageModalVisibilityHandler,
      messageModalDataHandler,
      messageModalData,
      toastHandler,
      eliminateToast,
      isAddBookmarkModalVisible,
      addBookmarkModalVisibilityHandler,
    }),
    [
      isConfirmModalVisible,
      confirmModalVisibilityHandler,
      isMessageModalVisible,
      messageModalVisibilityHandler,
      messageModalDataHandler,
      messageModalData,
      toastHandler,
      eliminateToast,
      isAddBookmarkModalVisible,
      addBookmarkModalVisibilityHandler,
    ]
  );
  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
};
export const useModalContext = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalContext must be used within ModalProvider');
  }
  return context;
};
