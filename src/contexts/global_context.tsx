/* eslint-disable */
import React, { useState, useContext, createContext, useMemo } from 'react';
import { RegisterFormModalProps } from '../interfaces/modals';
import PasskeySupportModal from '../components/passkey_support_modal/passkey_support_modal';
import RegisterFormModal from '../components/register_form_modal/register_form_modal';
import AddBookmarkModal from '../components/add_bookmark_modal/add_bookmark_modal';
import WarningModal from '../components/warning_modal/warning_modal';
import useWindowSize from '../lib/hooks/use_window_size';
import { LAYOUT_BREAKPOINT } from '../constants/display';
import { LayoutAssertion } from '../interfaces/layout_assertion';
import { IWaringModal, dummyWarningModalData } from '../interfaces/warning_modal';
import ConfirmModal from '../components/confirm_modal/confirm_modal';
import { IConfirmModal, dummyConfirmModalData } from '../interfaces/confirm_modal';
import AddPropertyModal from '../components/add_property_modal/add_property_modal';
import CameraScanner from '@/components/camera_scanner/camera_scanner';
import EmbedCodeModal from '../components/embed_code_modal/embed_code_modal';

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

  isWarningModalVisible: boolean;
  warningModalVisibilityHandler: () => void;
  warningModalData: IWaringModal;
  warningModalDataHandler: (data: IWaringModal) => void;

  isConfirmModalVisible: boolean;
  confirmModalVisibilityHandler: () => void;
  confirmModalDataHandler: (data: IConfirmModal) => void;

  isAddPropertyModalVisible: boolean;
  addPropertyModalVisibilityHandler: () => void;

  isCameraScannerVisible: boolean;
  cameraScannerVisibilityHandler: () => void;

  isEmbedCodeModalVisible: boolean;
  embedCodeModalVisibilityHandler: () => void;
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

  const [isWarningModalVisible, setIsWarningModalVisible] = useState(false);
  const [warningModalData, setWarningModalData] = useState<IWaringModal>(dummyWarningModalData);

  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<IConfirmModal>(dummyConfirmModalData);

  const [isAddPropertyModalVisible, setIsAddPropertyModalVisible] = useState(false);

  const [isCameraScannerVisible, setIsCameraScannerVisible] = useState(false);

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

  const warningModalVisibilityHandler = () => {
    setIsWarningModalVisible(!isWarningModalVisible);
  };

  const warningModalDataHandler = (data: IWaringModal) => {
    setWarningModalData(data);
  };

  const confirmModalVisibilityHandler = () => {
    setIsConfirmModalVisible(!isConfirmModalVisible);
  };

  const confirmModalDataHandler = (data: IConfirmModal) => {
    setConfirmModalData(data);
  };

  const addPropertyModalVisibilityHandler = () => {
    setIsAddPropertyModalVisible(!isAddPropertyModalVisible);
  };

  const cameraScannerVisibilityHandler = () => {
    setIsCameraScannerVisible(!isCameraScannerVisible);
  };

  const embedCodeModalVisibilityHandler = () => {
    setIsEmbedCodeModalVisible(!isEmbedCodeModalVisible);
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
    isWarningModalVisible,
    warningModalVisibilityHandler,
    warningModalData,
    warningModalDataHandler,
    isConfirmModalVisible,
    confirmModalVisibilityHandler,
    confirmModalDataHandler,
    isAddPropertyModalVisible,
    addPropertyModalVisibilityHandler,
    isCameraScannerVisible,
    cameraScannerVisibilityHandler,
    isEmbedCodeModalVisible,
    embedCodeModalVisibilityHandler,
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

      <WarningModal
        isModalVisible={isWarningModalVisible}
        modalVisibilityHandler={warningModalVisibilityHandler}
        warningModalData={warningModalData}
      />

      <ConfirmModal
        isModalVisible={isConfirmModalVisible}
        modalVisibilityHandler={confirmModalVisibilityHandler}
        confirmModalData={confirmModalData}
      />

      <AddPropertyModal
        isModalVisible={isAddPropertyModalVisible}
        modalVisibilityHandler={addPropertyModalVisibilityHandler}
      />

      <CameraScanner
        isModalVisible={isCameraScannerVisible}
        modalVisibilityHandler={cameraScannerVisibilityHandler}
      />

      <EmbedCodeModal
        isModalVisible={isEmbedCodeModalVisible}
        modalVisibilityHandler={embedCodeModalVisibilityHandler}
      />

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
