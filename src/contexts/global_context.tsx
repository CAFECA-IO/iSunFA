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
import { IToastify, ToastPosition, ToastType } from '@/interfaces/toastify';
import { RxCross2 } from 'react-icons/rx';

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

  isEntityInvitationModalVisible: boolean;
  entityInvitationModalVisibilityHandler: () => void;

  isCreateEntityModalVisible: boolean;
  createEntityModalVisibilityHandler: () => void;

  toastHandler: (props: IToastify) => void;
  eliminateToast: (id?: string) => void;
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

  const [isEntityInvitationModalVisible, setIsEntityInvitationModalVisible] = useState(false);

  const [isCreateEntityModalVisible, setIsCreateEntityModalVisible] = useState(false);

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

  const entityInvitationModalVisibilityHandler = () => {
    setIsEntityInvitationModalVisible(!isEntityInvitationModalVisible);
  };

  const createEntityModalVisibilityHandler = () => {
    setIsCreateEntityModalVisible(!isCreateEntityModalVisible);
  };

  // Info: (20240509 - Julian) toast handler
  const toastHandler = useCallback((props: IToastify) => {
    const {
      id,
      type,
      content,
      closeable,
      autoClose: isAutoClose,
      position: toastPosition,
      draggable: isDraggable,
      closeOnClick: isCloseOnClick,
    } = props;

    const bodyStyle = 'before:absolute before:h-100vh before:w-5px before:top-0 before:left-0';

    const toastId = id;
    const position = toastPosition ?? ToastPosition.TOP_CENTER; // Info:(20240513 - Julian) default position 'top-center'

    // Info:(20240513 - Julian) 如果 closeable 為 false，則 autoClose、closeOnClick、draggable 都會被設為 false
    const autoClose = closeable ? isAutoClose ?? 5000 : false; // Info:(20240513 - Julian) default autoClose 5000ms
    const closeOnClick = closeable ? isCloseOnClick : false; // Info:(20240513 - Julian) default closeOnClick true
    const draggable = closeable ? isDraggable : false; // Info:(20240513 - Julian) default draggable true
    const closeButton = closeable
      ? () => <RxCross2 size={16} className="text-secondaryBlue" />
      : false;

    switch (type) {
      case ToastType.SUCCESS:
        toastify.success(content, {
          icon: <Image src="/icons/success.svg" alt="info" width={24} height={24} />,
          className: `${bodyStyle} before:bg-successGreen3`,
          toastId,
          position,
          autoClose,
          closeOnClick,
          draggable,
          closeButton,
        });
        break;
      case ToastType.ERROR:
        toastify.error(content, {
          icon: <Image src="/icons/error.svg" alt="info" width={24} height={24} />,
          className: `${bodyStyle} before:bg-errorRed3`,
          toastId,
          position,
          autoClose,
          closeOnClick,
          draggable,
          closeButton,
        });
        break;
      case ToastType.WARNING:
        toastify.warning(content, {
          icon: <Image src="/icons/warning.svg" alt="info" width={24} height={24} />,
          className: `${bodyStyle} before:bg-warningYellow`,
          toastId,
          position,
          autoClose,
          closeOnClick,
          draggable,
          closeButton,
        });
        break;
      case ToastType.INFO:
        toastify.info(content, {
          icon: <Image src="/icons/info.svg" alt="info" width={24} height={24} />,
          className: `${bodyStyle} before:bg-navyBlue2`,
          toastId,
          position,
          autoClose,
          closeOnClick,
          draggable,
          closeButton,
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
    isEntityInvitationModalVisible,
    entityInvitationModalVisibilityHandler,
    isCreateEntityModalVisible,
    createEntityModalVisibilityHandler,
    toastHandler,
    eliminateToast,
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
