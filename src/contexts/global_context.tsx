/* eslint-disable */
import React, { useState, useContext, createContext, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { RegisterFormModalProps } from '../interfaces/modals';
import PasskeySupportModal from '../components/passkey_support_modal/passkey_support_modal';
import RegisterFormModal from '../components/register_form_modal/register_form_modal';
import AddBookmarkModal from '../components/add_bookmark_modal/add_bookmark_modal';
import MessageModal from '../components/message_modal/message_modal';
import useWindowSize from '../lib/hooks/use_window_size';
import { LAYOUT_BREAKPOINT } from '../constants/display';
import { LayoutAssertion } from '../interfaces/layout_assertion';
import { IMessageModal, dummyMessageModalData } from '../interfaces/message_modal';
import ConfirmModal from '../components/confirm_modal/confirm_modal';
import { IConfirmModal, dummyConfirmModalData } from '../interfaces/confirm_modal';
import AddAssetModal from '../components/add_asset_modal/add_asset_modal';
import CameraScanner from '@/components/camera_scanner/camera_scanner';
import PreviewInvoiceModal from '@/components/preview_invoice_modal/preview_invoice_modal';
import {
  IPreviewInvoiceModal,
  dummyPreviewInvoiceModalData,
} from '@/interfaces/preview_invoice_modal';
import EmbedCodeModal from '../components/embed_code_modal/embed_code_modal';
import Toast from '@/components/toast/toast';
import { toast as toastify } from 'react-toastify';
import { IToastify, ToastPosition } from '@/interfaces/toastify';

interface IGlobalContext {
  width: number;
  height: number;
  layoutAssertion: LayoutAssertion;

  isPasskeySupportModalVisible: boolean;
  passKeySupportModalVisibilityHandler: () => void;

  isRegisterModalVisible: boolean;
  registerModalVisibilityHandler: () => void;
  registerModalData: RegisterFormModalProps;
  registerModalDataHandler: (data: RegisterFormModalProps) => void;

  isAddBookmarkModalVisible: boolean;
  addBookmarkModalVisibilityHandler: () => void;

  isMessageModalVisible: boolean;
  messageModalVisibilityHandler: () => void;
  messageModalData: IMessageModal;
  messageModalDataHandler: (data: IMessageModal) => void;

  isConfirmModalVisible: boolean;
  confirmModalVisibilityHandler: () => void;
  confirmModalDataHandler: (data: IConfirmModal) => void;

  isAddAssetModalVisible: boolean;
  addAssetModalVisibilityHandler: () => void;

  isCameraScannerVisible: boolean;
  cameraScannerVisibilityHandler: () => void;

  isPreviewInvoiceModalVisible: boolean;
  previewInvoiceModalVisibilityHandler: () => void;
  previewInvoiceModalDataHandler: (data: IPreviewInvoiceModal) => void;

  isEmbedCodeModalVisible: boolean;
  embedCodeModalVisibilityHandler: () => void;

  toastHandler: (props: IToastify) => void;
}

export interface IGlobalProvider {
  children: React.ReactNode;
}

const GlobalContext = createContext<IGlobalContext | undefined>(undefined);

export const GlobalProvider = ({ children }: IGlobalProvider) => {
  const windowSize = useWindowSize();
  const [isPasskeySupportModalVisible, setIsPasskeySupportModalVisible] = useState(false);
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [registerModalData, setRegisterModalData] = useState<RegisterFormModalProps>({
    username: '',
  });

  const [isAddBookmarkModalVisible, setIsAddBookmarkModalVisible] = useState(false);

  const [isMessageModalVisible, setIsMessageModalVisible] = useState(false);
  const [messageModalData, setMessageModalData] = useState<IMessageModal>(dummyMessageModalData);

  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<IConfirmModal>(dummyConfirmModalData);

  const [isAddAssetModalVisible, setIsAddAssetModalVisible] = useState(false);

  const [isCameraScannerVisible, setIsCameraScannerVisible] = useState(false);

  const [isPreviewInvoiceModalVisible, setIsPreviewInvoiceModalVisible] = useState(false);
  const [previewInvoiceModalData, setPreviewInvoiceModalData] = useState<IPreviewInvoiceModal>(
    dummyPreviewInvoiceModalData
  );

  const [isEmbedCodeModalVisible, setIsEmbedCodeModalVisible] = useState(false);

  const { width, height } = windowSize;

  const layoutAssertion = useMemo(() => {
    return width < LAYOUT_BREAKPOINT ? LayoutAssertion.MOBILE : LayoutAssertion.DESKTOP;
  }, [width]);

  const passKeySupportModalVisibilityHandler = () => {
    setIsPasskeySupportModalVisible(!isPasskeySupportModalVisible);
  };

  const registerModalVisibilityHandler = () => {
    setIsRegisterModalVisible(!isRegisterModalVisible);
  };

  const registerModalDataHandler = (data: RegisterFormModalProps) => {
    setRegisterModalData(data);
  };

  const addBookmarkModalVisibilityHandler = () => {
    setIsAddBookmarkModalVisible(!isAddBookmarkModalVisible);
  };

  const messageModalVisibilityHandler = () => {
    setIsMessageModalVisible(!isMessageModalVisible);
  };

  const messageModalDataHandler = (data: IMessageModal) => {
    setMessageModalData(data);
  };

  const confirmModalVisibilityHandler = () => {
    setIsConfirmModalVisible(!isConfirmModalVisible);
  };

  const confirmModalDataHandler = (data: IConfirmModal) => {
    setConfirmModalData(data);
  };

  const addAssetModalVisibilityHandler = () => {
    setIsAddAssetModalVisible(!isAddAssetModalVisible);
  };

  const cameraScannerVisibilityHandler = () => {
    setIsCameraScannerVisible(!isCameraScannerVisible);
  };

  const previewInvoiceModalVisibilityHandler = () => {
    setIsPreviewInvoiceModalVisible(!isPreviewInvoiceModalVisible);
  };

  const previewInvoiceModalDataHandler = (data: IPreviewInvoiceModal) => {
    setPreviewInvoiceModalData(data);
  };
  const embedCodeModalVisibilityHandler = () => {
    setIsEmbedCodeModalVisible(!isEmbedCodeModalVisible);
  };

  // Info: (20240509 - Julian) toast handler
  const toastHandler = useCallback((props: IToastify) => {
    const { type, content, autoClose, position, draggable, closeOnClick } = props;
    const bodyStyle = 'before:absolute before:h-100vh before:w-5px before:top-0 before:left-0';

    switch (type) {
      case 'success':
        toastify.success(content, {
          icon: <Image src="/icons/success.svg" alt="info" width={24} height={24} />,
          position: position ?? ToastPosition.TOP_CENTER,
          autoClose: autoClose ?? 5000,
          closeOnClick: closeOnClick ?? true,
          draggable: draggable ?? true,
          className: `${bodyStyle} before:bg-successGreen3`,
        });
        break;
      case 'error':
        toastify.error(content, {
          // ToDo: (20240510 - Julian) error icon 待捕上
          icon: <Image src="/icons/error.svg" alt="info" width={24} height={24} />,
          position: position ?? ToastPosition.TOP_CENTER,
          autoClose: autoClose ?? 5000,
          closeOnClick: closeOnClick ?? true,
          draggable: draggable ?? true,
          className: `${bodyStyle} before:bg-errorRed3`,
        });
        break;
      case 'warning':
        toastify.warning(content, {
          icon: <Image src="/icons/warning.svg" alt="info" width={24} height={24} />,
          position: position ?? ToastPosition.TOP_CENTER,
          autoClose: autoClose ?? 5000,
          closeOnClick: closeOnClick ?? true,
          draggable: draggable ?? true,
          className: `${bodyStyle} before:bg-warningYellow`,
        });
        break;
      case 'info':
        toastify.info(content, {
          icon: <Image src="/icons/info.svg" alt="info" width={24} height={24} />,
          position: position ?? ToastPosition.TOP_CENTER,
          autoClose: autoClose ?? 5000,
          closeOnClick: closeOnClick ?? true,
          draggable: draggable ?? true,
          className: `${bodyStyle} before:bg-navyBlue2`,
        });
        break;
      default:
        toastify(content);
        break;
    }
  }, []);

  /* eslint-disable react/jsx-no-constructed-context-values */
  const value = {
    width,
    height,
    layoutAssertion,
    isPasskeySupportModalVisible,
    passKeySupportModalVisibilityHandler,
    isRegisterModalVisible,
    registerModalVisibilityHandler,
    registerModalData,
    registerModalDataHandler,
    isAddBookmarkModalVisible,
    addBookmarkModalVisibilityHandler,
    isMessageModalVisible,
    messageModalVisibilityHandler,
    messageModalData,
    messageModalDataHandler,
    isConfirmModalVisible,
    confirmModalVisibilityHandler,
    confirmModalDataHandler,
    isAddAssetModalVisible,
    addAssetModalVisibilityHandler,
    isCameraScannerVisible,
    cameraScannerVisibilityHandler,
    isPreviewInvoiceModalVisible,
    previewInvoiceModalVisibilityHandler,
    previewInvoiceModalDataHandler,
    isEmbedCodeModalVisible,
    embedCodeModalVisibilityHandler,
    toastHandler,
  };

  return (
    <GlobalContext.Provider value={value}>
      <PasskeySupportModal
        isModalVisible={isPasskeySupportModalVisible}
        modalVisibilityHandler={passKeySupportModalVisibilityHandler}
      />

      <RegisterFormModal
        isModalVisible={isRegisterModalVisible}
        modalVisibilityHandler={registerModalVisibilityHandler}
      />

      <AddBookmarkModal
        isModalVisible={isAddBookmarkModalVisible}
        modalVisibilityHandler={addBookmarkModalVisibilityHandler}
      />

      <MessageModal
        isModalVisible={isMessageModalVisible}
        modalVisibilityHandler={messageModalVisibilityHandler}
        messageModalData={messageModalData}
      />

      <ConfirmModal
        isModalVisible={isConfirmModalVisible}
        modalVisibilityHandler={confirmModalVisibilityHandler}
        confirmModalData={confirmModalData}
      />

      <AddAssetModal
        isModalVisible={isAddAssetModalVisible}
        modalVisibilityHandler={addAssetModalVisibilityHandler}
      />

      <CameraScanner
        isModalVisible={isCameraScannerVisible}
        modalVisibilityHandler={cameraScannerVisibilityHandler}
      />

      <PreviewInvoiceModal
        isModalVisible={isPreviewInvoiceModalVisible}
        modalVisibilityHandler={previewInvoiceModalVisibilityHandler}
        previewInvoiceModalData={previewInvoiceModalData}
      />

      <EmbedCodeModal
        isModalVisible={isEmbedCodeModalVisible}
        modalVisibilityHandler={embedCodeModalVisibilityHandler}
      />

      <Toast />

      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalCtx = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }

  // Deprecated: Debug tool [to be removed](20231120 - Shirley)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any =
    typeof globalThis === 'object'
      ? globalThis
      : typeof window === 'object'
        ? window
        : typeof global === 'object'
          ? global
          : null; // Info: Causes an error on the next line

  g.globalContext = context;
  return context;
};
