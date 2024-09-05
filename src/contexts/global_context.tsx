import React, { useState, useContext, createContext, useMemo, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { toast as toastify } from 'react-toastify';
import { RxCross2 } from 'react-icons/rx';
import { DUMMY_FILTER_OPTIONS, FilterOptionsModalType, IFilterOptions } from '@/interfaces/modals';
import PasskeySupportModal from '@/components/passkey_support_modal/passkey_support_modal';
import MessageModal from '@/components/message_modal/message_modal';
import useWindowSize from '@/lib/hooks/use_window_size';
import { LAYOUT_BREAKPOINT } from '@/constants/display';
import { LayoutAssertion } from '@/interfaces/layout_assertion';
import { IMessageModal, dummyMessageModalData } from '@/interfaces/message_modal';
// eslint-disable-next-line import/no-cycle
import ConfirmModal from '@/components/confirm_modal/confirm_modal';
import AddAssetModal from '@/components/add_asset_modal/add_asset_modal';
// eslint-disable-next-line import/no-cycle
import CameraScanner from '@/components/camera_scanner/camera_scanner';
// eslint-disable-next-line import/no-cycle
import PreviewInvoiceModal from '@/components/preview_invoice_modal/preview_invoice_modal';
import {
  IPreviewInvoiceModal,
  dummyPreviewInvoiceModalData,
} from '@/interfaces/preview_invoice_modal';
import EmbedCodeModal from '@/components/embed_code_modal/embed_code_modal';
import Toast from '@/components/toast/toast';
import { IToastify, ToastPosition, ToastType } from '@/interfaces/toastify';
// eslint-disable-next-line import/no-cycle
import CreateCompanyModal from '@/components/create_company_modal/create_company_modal';
// eslint-disable-next-line import/no-cycle
import CompanyInvitationModal from '@/components/company_invitation_modal/company_invitation_modal';
import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useRouter } from 'next/router';
import LoadingModal from '@/components/loading_modal/loading_modal';
import { IConfirmModal, dummyConfirmModalData } from '@/interfaces/confirm_modal';
import FilterOptionsModal from '@/components/filter_options_modal/filter_options_modal';
// eslint-disable-next-line import/no-cycle
import AddProjectModal from '@/components/add_project_modal/add_project_modal';
import { useUserCtx } from '@/contexts/user_context';
import { useNotificationCtx } from '@/contexts/notification_context';
import { ProjectStage } from '@/constants/project';
// eslint-disable-next-line import/no-cycle
import EditBookmarkModal from '@/components/edit_bookmark_modal/edit_bookmark_modal';
// eslint-disable-next-line import/no-cycle
import ProfileUploadModal from '@/components/profile_upload_modal/profile_upload_modal';
import SalaryBookConfirmModal from '@/components/salary_book_confirm_modal/salary_book_confirm_modal';
import { ToastId } from '@/constants/toast_id';
import { useTranslation } from 'next-i18next';
// eslint-disable-next-line import/no-cycle
import AddAccountTitleModal from '@/components/add_account_title_modal/add_account_title_modal';
// eslint-disable-next-line import/no-cycle
import EditAccountTitleModal from '@/components/edit_account_title_modal/edit_account_title_modal';
// eslint-disable-next-line import/no-cycle
import TeamSettingModal from '@/components/team_setting_modal/team_setting_modal';
// eslint-disable-next-line import/no-cycle
import TransferCompanyModal from '@/components/transfer_company_modal/transfer_company_modal';
import { UploadType } from '@/constants/file';
import LoginConfirmModal from '@/components/login_confirm_modal/login_confirm_modal';

interface IGlobalContext {
  width: number;
  height: number;
  layoutAssertion: LayoutAssertion;

  isPasskeySupportModalVisible: boolean;
  passKeySupportModalVisibilityHandler: () => void;

  isAddBookmarkModalVisible: boolean;
  addBookmarkModalVisibilityHandler: () => void;

  isMessageModalVisible: boolean;
  messageModalVisibilityHandler: () => void;
  messageModalData: IMessageModal;
  messageModalDataHandler: (data: IMessageModal) => void;

  isConfirmModalVisible: boolean;
  confirmModalVisibilityHandler: () => void;
  confirmModalData: IConfirmModal;
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

  isCompanyInvitationModalVisible: boolean;
  companyInvitationModalVisibilityHandler: () => void;

  isCreateCompanyModalVisible: boolean;
  createCompanyModalVisibilityHandler: () => void;

  isLoadingModalVisible: boolean;
  loadingModalVisibilityHandler: () => void;

  isAddProjectModalVisible: boolean;
  addProjectModalVisibilityHandler: () => void;
  addProjectModalDataHandler: (stage: ProjectStage) => void;

  isSalaryBookConfirmModalVisible: boolean;
  salaryBookConfirmModalVisibilityHandler: () => void;

  profileUploadModalVisible: boolean;
  profileUploadModalVisibilityHandler: () => void;
  profileUploadModalDataHandler: (type: UploadType) => void;

  isAddAccountTitleModalVisible: boolean;
  addAccountTitleModalVisibilityHandler: () => void;
  addAccountTitleDataHandler: (id: number) => void;

  isEditAccountTitleModalVisible: boolean;
  editAccountTitleModalVisibilityHandler: () => void;
  editAccountTitleDataHandler: (id: number) => void;

  toastHandler: (props: IToastify) => void;
  eliminateToast: (id?: string) => void;

  filterOptionsForHistory: IFilterOptions;
  filterOptionsForPending: IFilterOptions;
  filterOptionsForContract: IFilterOptions;
  getFilterOptionsForHistory: (options: IFilterOptions) => void;
  getFilterOptionsForPending: (options: IFilterOptions) => void;
  getFilterOptionsForContract: (options: IFilterOptions) => void;
  isFilterOptionsModalForHistoryVisible: boolean;
  isFilterOptionsModalForPendingVisible: boolean;
  isFilterOptionsModalForContractVisible: boolean;
  filterOptionsModalVisibilityHandler: (filterType: FilterOptionsModalType) => void;

  isTeamSettingModalVisible: boolean;
  teamSettingModalVisibilityHandler: () => void;

  isTransferCompanyModalVisible: boolean;
  transferCompanyModalVisibilityHandler: () => void;

  agreeWithInfomationConfirmModalVisibilityHandler: (visibility: boolean) => void;
}

export interface IGlobalProvider {
  children: React.ReactNode;
}

const GlobalContext = createContext<IGlobalContext | undefined>(undefined);

export const GlobalProvider = ({ children }: IGlobalProvider) => {
  const { t } = useTranslation([
    'common',
    'project',
    'journal',
    'kyc',
    'report_401',
    'salary',
    'setting',
    'terms',
  ]);
  const router = useRouter();
  const { pathname } = router;

  const { signedIn, selectedCompany, isAgreeInfoCollection, isAgreeTosNPrivacyPolicy } =
    useUserCtx();
  const { reportGeneratedStatus, reportPendingStatus, reportGeneratedStatusHandler } =
    useNotificationCtx();

  const windowSize = useWindowSize();
  const [isPasskeySupportModalVisible, setIsPasskeySupportModalVisible] = useState(false);

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

  const [isCompanyInvitationModalVisible, setIsCompanyInvitationModalVisible] = useState(false);

  const [isCreateCompanyModalVisible, setIsCreateCompanyModalVisible] = useState(false);

  const [isLoadingModalVisible, setIsLoadingModalVisible] = useState(false);

  const [isFilterOptionsModalForHistoryVisible, setIsFilterOptionsModalForHistoryVisible] =
    useState(false);
  const [isFilterOptionsModalForPendingVisible, setIsFilterOptionsModalForPendingVisible] =
    useState(false);
  const [isFilterOptionsModalForContractVisible, setIsFilterOptionsModalForContractVisible] =
    useState(false);

  const [filterOptionsForHistory, setFilterOptionsForHistory] =
    useState<IFilterOptions>(DUMMY_FILTER_OPTIONS);
  const [filterOptionsForPending, setFilterOptionsForPending] =
    useState<IFilterOptions>(DUMMY_FILTER_OPTIONS);
  const [filterOptionsForContract, setFilterOptionsForContract] =
    useState<IFilterOptions>(DUMMY_FILTER_OPTIONS);

  const [isAddProjectModalVisible, setIsAddProjectModalVisible] = useState(false);
  const [addProjectDefaultStage, setAddProjectDefaultStage] = useState<ProjectStage>(
    ProjectStage.SELLING
  );

  const [profileUploadModalVisible, setProfileUploadModalVisible] = useState(false);
  const [uploadImageType, setUploadImageType] = useState<UploadType>(UploadType.USER);

  const [isSalaryBookConfirmModalVisible, setIsSalaryBookConfirmModalVisible] = useState(false);

  const [isAddAccountTitleModalVisible, setIsAddAccountTitleModalVisible] = useState(false);
  const [addAccountTitleId, setAddAccountTitleId] = useState(0);

  const [isEditAccountTitleModalVisible, setIsEditAccountTitleModalVisible] = useState(false);
  const [editAccountTitleId, setEditAccountTitleId] = useState(0);

  const [isTeamSettingModalVisible, setIsTeamSettingModalVisible] = useState(false);

  const [isTransferCompanyModalVisible, setIsTransferCompanyModalVisible] = useState(false);

  const [isAgreeWithInfomationConfirmModalVisible, setIsAgreeWithInfomationConfirmModalVisible] =
    useState(false);

  const [isTOSNPrivacyPolicyConfirmModalVisible, setIsTOSNPrivacyPolicyConfirmModalVisible] =
    useState(false);

  const { width, height } = windowSize;

  const layoutAssertion = useMemo(() => {
    return width < LAYOUT_BREAKPOINT ? LayoutAssertion.MOBILE : LayoutAssertion.DESKTOP;
  }, [width]);

  const passKeySupportModalVisibilityHandler = () => {
    setIsPasskeySupportModalVisible(!isPasskeySupportModalVisible);
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

  const companyInvitationModalVisibilityHandler = () => {
    setIsCompanyInvitationModalVisible(!isCompanyInvitationModalVisible);
  };

  const createCompanyModalVisibilityHandler = () => {
    setIsCreateCompanyModalVisible(!isCreateCompanyModalVisible);
  };

  const loadingModalVisibilityHandler = () => {
    setIsLoadingModalVisible(!isLoadingModalVisible);
  };

  const filterOptionsModalVisibilityHandlerForHistory = () => {
    setIsFilterOptionsModalForHistoryVisible(!isFilterOptionsModalForHistoryVisible);
  };

  const filterOptionsModalVisibilityHandlerForPending = () => {
    setIsFilterOptionsModalForPendingVisible(!isFilterOptionsModalForPendingVisible);
  };

  const filterOptionsModalVisibilityHandlerForContract = () => {
    setIsFilterOptionsModalForContractVisible(!isFilterOptionsModalForContractVisible);
  };

  const addProjectModalVisibilityHandler = () => {
    setIsAddProjectModalVisible(!isAddProjectModalVisible);
  };

  const addProjectModalDataHandler = (stage: ProjectStage) => {
    setAddProjectDefaultStage(stage);
  };

  const profileUploadModalVisibilityHandler = () => {
    setProfileUploadModalVisible(!profileUploadModalVisible);
  };

  const profileUploadModalDataHandler = (type: UploadType) => {
    setUploadImageType(type);
  };

  const salaryBookConfirmModalVisibilityHandler = () => {
    setIsSalaryBookConfirmModalVisible(!isSalaryBookConfirmModalVisible);
  };

  const addAccountTitleModalVisibilityHandler = () => {
    setIsAddAccountTitleModalVisible(!isAddAccountTitleModalVisible);
  };

  const addAccountTitleDataHandler = (id: number) => {
    setAddAccountTitleId(id);
  };

  const editAccountTitleModalVisibilityHandler = () => {
    setIsEditAccountTitleModalVisible(!isEditAccountTitleModalVisible);
  };

  const editAccountTitleDataHandler = (id: number) => {
    setEditAccountTitleId(id);
  };

  const teamSettingModalVisibilityHandler = () => {
    setIsTeamSettingModalVisible(!isTeamSettingModalVisible);
  };

  const transferCompanyModalVisibilityHandler = () => {
    setIsTransferCompanyModalVisible(!isTransferCompanyModalVisible);
  };

  const filterOptionsModalVisibilityHandler = (filterType: FilterOptionsModalType) => {
    if (filterType === FilterOptionsModalType.history) {
      filterOptionsModalVisibilityHandlerForHistory();
    } else if (filterType === FilterOptionsModalType.pending) {
      filterOptionsModalVisibilityHandlerForPending();
    } else if (filterType === FilterOptionsModalType.contract) {
      filterOptionsModalVisibilityHandlerForContract();
    }
  };

  const getFilterOptionsForHistory = (options: IFilterOptions) => {
    setFilterOptionsForHistory(options);
  };

  const getFilterOptionsForPending = (options: IFilterOptions) => {
    setFilterOptionsForPending(options);
  };

  const getFilterOptionsForContract = (options: IFilterOptions) => {
    setFilterOptionsForContract(options);
  };

  const agreeWithInfomationConfirmModalVisibilityHandler = (visibility: boolean) => {
    setIsAgreeWithInfomationConfirmModalVisible(visibility);
  };

  const TOSNPrivacyPolicyConfirmModalVisibilityHandler = (visibility: boolean) => {
    setIsTOSNPrivacyPolicyConfirmModalVisible(visibility);
  };

  // Info: (20240509 - Julian) toast handler
  const toastHandler = useCallback((props: IToastify) => {
    const {
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
      'before:absolute before:h-100vh before:w-5px before:top-0 before:left-0 md:w-400px w-100vw md:scale-100 scale-75 text-sm font-barlow pointer-events-auto';

    const toastId = id;
    const position = toastPosition ?? ToastPosition.TOP_CENTER; // Info:(20240513 - Julian) default position 'top-center'

    // Info:(20240513 - Julian) 如果 closeable 為 false，則 autoClose、closeOnClick、draggable 都會被設為 false
    const autoClose = closeable ? isAutoClose ?? 5000 : false; // Info:(20240513 - Julian) default autoClose 5000ms

    const closeOnClick = closeable; // Info:(20240513 - Julian) default closeOnClick true
    const draggable = closeable; // Info:(20240513 - Julian) default draggable true
    const closeButton = closeable
      ? () => (
          <div className="h-20px w-20px">
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

  useEffect(() => {
    if (!signedIn) return;

    if (reportGeneratedStatus) {
      toastHandler({
        type: ToastType.SUCCESS,
        id: 'latest-report-generated',
        closeable: true,
        content: (
          <div className="flex items-center space-x-5">
            <p>{t('report_401:AUDIT_REPORT.YOUR_REPORT_IS_DONE')}</p>
            <Link
              href={ISUNFA_ROUTE.USERS_MY_REPORTS}
              className="font-semibold text-link-text-success hover:opacity-70"
            >
              {t('common:COMMON.GO_CHECK_IT')}
            </Link>
          </div>
        ),
        position: ToastPosition.BOTTOM_RIGHT,
        autoClose: false,
        onClose: () => {
          reportGeneratedStatusHandler(false);
        },
      });
    }

    // TODO: (20240529 - Shirley) [Beta] Consistent toast will cloak the bottom menu, which should be fixed before the following is uncommented
    // if (reportPendingStatus) {
    //   toastHandler({
    //     type: ToastType.INFO,
    //     id: 'report-generating',
    //     closeable: false,
    //     content: (
    //       <div className="flex items-center space-x-2">
    //         <span>Generating the report</span>
    //         <LoadingSVG />
    //       </div>
    //     ),
    //     position: ToastPosition.BOTTOM_RIGHT,
    //     autoClose: false,
    //   });
    // }
  }, [reportPendingStatus, reportGeneratedStatus, signedIn, pathname]);

  useEffect(() => {
    if (signedIn) {
      if (!isAgreeInfoCollection || !isAgreeTosNPrivacyPolicy) {
        if (router.pathname !== ISUNFA_ROUTE.LOGIN) router.push(ISUNFA_ROUTE.LOGIN);
        if (!isAgreeInfoCollection) agreeWithInfomationConfirmModalVisibilityHandler(true);
        if (isAgreeInfoCollection && !isAgreeTosNPrivacyPolicy) {
          TOSNPrivacyPolicyConfirmModalVisibilityHandler(true);
        }
      } else {
        agreeWithInfomationConfirmModalVisibilityHandler(false);
        TOSNPrivacyPolicyConfirmModalVisibilityHandler(false);
      }
    }
  }, [pathname, signedIn, isAgreeInfoCollection, isAgreeTosNPrivacyPolicy]);

  useEffect(() => {
    if (signedIn) {
      if (router.pathname.startsWith('/users') && !router.pathname.includes(ISUNFA_ROUTE.LOGIN)) {
        eliminateToast(ToastId.ALPHA_TEST_REMINDER);
        if (!router.pathname.includes(ISUNFA_ROUTE.SELECT_COMPANY)) {
          // Info: (20240807 - Anna) 在KYC頁面時，不顯示試用版Toast
          if (!selectedCompany && !router.pathname.includes(ISUNFA_ROUTE.KYC)) {
            // Info: (20240513 - Julian) 在使用者選擇公司前，不可以關閉這個 Toast
            toastHandler({
              id: ToastId.TRIAL,
              type: ToastType.INFO,
              closeable: false,
              content: (
                <div className="flex items-center justify-between">
                  <p className="text-sm">{t('common:COMMON.ISUNFA_TRIAL_VERSION')}</p>
                  <Link
                    href={ISUNFA_ROUTE.SELECT_COMPANY}
                    className="text-base font-semibold text-link-text-primary"
                  >
                    {t('common:COMMON.END_OF_TRIAL')}
                  </Link>
                </div>
              ),
            });
          }
        } else {
          eliminateToast(ToastId.TRIAL);
        }
      }
    } else {
      eliminateToast();
      if (router.pathname.includes(ISUNFA_ROUTE.LOGIN)) {
        toastHandler({
          id: ToastId.ALPHA_TEST_REMINDER,
          type: ToastType.INFO,
          closeable: true,
          autoClose: false,
          content: (
            <div className="flex items-center justify-between">
              <p className="font-barlow text-sm">{t('common:COMMON.ALPHA_TEST_REMINDER')}</p>
            </div>
          ),
        });
      } else {
        eliminateToast(ToastId.ALPHA_TEST_REMINDER);
      }
    }
  }, [pathname, signedIn]);

  // Info: (20240830 - Anna) 為了拿掉react/jsx-no-constructed-context-values註解，所以使用useMemo hook

  const value = useMemo(
    () => ({
      width,
      height,
      layoutAssertion,
      isPasskeySupportModalVisible,
      passKeySupportModalVisibilityHandler,
      isAddBookmarkModalVisible,
      addBookmarkModalVisibilityHandler,
      isMessageModalVisible,
      messageModalVisibilityHandler,
      messageModalData,
      messageModalDataHandler,
      isConfirmModalVisible,
      confirmModalVisibilityHandler,
      confirmModalData,
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
      isCompanyInvitationModalVisible,
      companyInvitationModalVisibilityHandler,
      isCreateCompanyModalVisible,
      createCompanyModalVisibilityHandler,
      isLoadingModalVisible,
      loadingModalVisibilityHandler,
      isSalaryBookConfirmModalVisible,
      salaryBookConfirmModalVisibilityHandler,
      isAddAccountTitleModalVisible,
      addAccountTitleModalVisibilityHandler,
      addAccountTitleDataHandler,
      isEditAccountTitleModalVisible,
      editAccountTitleModalVisibilityHandler,
      editAccountTitleDataHandler,
      toastHandler,
      eliminateToast,

      filterOptionsForHistory,
      filterOptionsForPending,
      filterOptionsForContract,
      getFilterOptionsForHistory,
      getFilterOptionsForPending,
      getFilterOptionsForContract,
      isFilterOptionsModalForHistoryVisible,
      isFilterOptionsModalForPendingVisible,
      isFilterOptionsModalForContractVisible,
      filterOptionsModalVisibilityHandler,
      isAddProjectModalVisible,
      addProjectModalVisibilityHandler,
      addProjectModalDataHandler,
      profileUploadModalVisible,
      profileUploadModalVisibilityHandler,
      profileUploadModalDataHandler,

      isTeamSettingModalVisible,
      teamSettingModalVisibilityHandler,

      isTransferCompanyModalVisible,
      transferCompanyModalVisibilityHandler,

      agreeWithInfomationConfirmModalVisibilityHandler,
    }),
    [
      width,
      height,
      layoutAssertion,
      isPasskeySupportModalVisible,
      passKeySupportModalVisibilityHandler,
      isAddBookmarkModalVisible,
      addBookmarkModalVisibilityHandler,
      isMessageModalVisible,
      messageModalVisibilityHandler,
      messageModalData,
      messageModalDataHandler,
      isConfirmModalVisible,
      confirmModalVisibilityHandler,
      confirmModalData,
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
      isCompanyInvitationModalVisible,
      companyInvitationModalVisibilityHandler,
      isCreateCompanyModalVisible,
      createCompanyModalVisibilityHandler,
      isLoadingModalVisible,
      loadingModalVisibilityHandler,
      isSalaryBookConfirmModalVisible,
      salaryBookConfirmModalVisibilityHandler,
      isAddAccountTitleModalVisible,
      addAccountTitleModalVisibilityHandler,
      addAccountTitleDataHandler,
      isEditAccountTitleModalVisible,
      editAccountTitleModalVisibilityHandler,
      editAccountTitleDataHandler,
      toastHandler,
      eliminateToast,

      filterOptionsForHistory,
      filterOptionsForPending,
      filterOptionsForContract,
      getFilterOptionsForHistory,
      getFilterOptionsForPending,
      getFilterOptionsForContract,
      isFilterOptionsModalForHistoryVisible,
      isFilterOptionsModalForPendingVisible,
      isFilterOptionsModalForContractVisible,
      filterOptionsModalVisibilityHandler,
      isAddProjectModalVisible,
      addProjectModalVisibilityHandler,
      addProjectModalDataHandler,
      profileUploadModalVisible,
      profileUploadModalVisibilityHandler,
      profileUploadModalDataHandler,

      isTeamSettingModalVisible,
      teamSettingModalVisibilityHandler,

      isTransferCompanyModalVisible,
      transferCompanyModalVisibilityHandler,

      agreeWithInfomationConfirmModalVisibilityHandler,
    ]
  );

  return (
    <GlobalContext.Provider value={value}>
      <PasskeySupportModal
        isModalVisible={isPasskeySupportModalVisible}
        modalVisibilityHandler={passKeySupportModalVisibilityHandler}
      />
      {/* Todo: (20240829 - Anna) 修改循環引用問題 */}
      <EditBookmarkModal
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
        confirmData={confirmModalData}
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

      <CreateCompanyModal
        isModalVisible={isCreateCompanyModalVisible}
        modalVisibilityHandler={createCompanyModalVisibilityHandler}
      />

      <CompanyInvitationModal
        isModalVisible={isCompanyInvitationModalVisible}
        modalVisibilityHandler={companyInvitationModalVisibilityHandler}
        toastHandler={toastHandler}
      />

      <LoadingModal
        isModalVisible={isLoadingModalVisible}
        modalVisibilityHandler={loadingModalVisibilityHandler}
      />

      <Toast />

      <FilterOptionsModal
        isModalVisible={isFilterOptionsModalForPendingVisible}
        filterType={FilterOptionsModalType.pending}
        modalVisibilityHandler={filterOptionsModalVisibilityHandlerForPending}
        getFilterOptions={getFilterOptionsForPending}
      />
      <FilterOptionsModal
        isModalVisible={isFilterOptionsModalForHistoryVisible}
        filterType={FilterOptionsModalType.history}
        modalVisibilityHandler={filterOptionsModalVisibilityHandlerForHistory}
        getFilterOptions={getFilterOptionsForHistory}
      />
      <FilterOptionsModal
        isModalVisible={isFilterOptionsModalForContractVisible}
        filterType={FilterOptionsModalType.contract}
        modalVisibilityHandler={filterOptionsModalVisibilityHandlerForContract}
        getFilterOptions={getFilterOptionsForContract}
      />

      <AddProjectModal
        isModalVisible={isAddProjectModalVisible}
        modalVisibilityHandler={addProjectModalVisibilityHandler}
        defaultStage={addProjectDefaultStage}
      />

      <ProfileUploadModal
        isModalVisible={profileUploadModalVisible}
        modalVisibilityHandler={profileUploadModalVisibilityHandler}
        uploadType={uploadImageType}
      />

      <SalaryBookConfirmModal
        isModalVisible={isSalaryBookConfirmModalVisible}
        modalVisibilityHandler={salaryBookConfirmModalVisibilityHandler}
      />

      <AddAccountTitleModal
        isModalVisible={isAddAccountTitleModalVisible}
        modalVisibilityHandler={addAccountTitleModalVisibilityHandler}
        modalData={{ accountId: addAccountTitleId }}
      />

      <EditAccountTitleModal
        isModalVisible={isEditAccountTitleModalVisible}
        modalVisibilityHandler={editAccountTitleModalVisibilityHandler}
        modalData={{ accountId: editAccountTitleId }}
      />

      <TeamSettingModal
        isModalVisible={isTeamSettingModalVisible}
        modalVisibilityHandler={teamSettingModalVisibilityHandler}
      />

      <TransferCompanyModal
        isModalVisible={isTransferCompanyModalVisible}
        modalVisibilityHandler={transferCompanyModalVisibilityHandler}
      />

      <LoginConfirmModal
        id="agree-with-information"
        isModalVisible={isAgreeWithInfomationConfirmModalVisible}
        modalData={{
          title: t('common:COMMON.PLEASE_READ_AND_AGREE_THE_FIRST_TIME_YOU_LOGIN'),
          content: 'info_collection_statement',
          buttonText: t('common:COMMON.AGREE_WITH_INFORMATION_COLLECTION_STATEMENT'),
        }}
        infoModalVisibilityHandler={agreeWithInfomationConfirmModalVisibilityHandler}
        tosModalVisibilityHandler={TOSNPrivacyPolicyConfirmModalVisibilityHandler}
      />

      <LoginConfirmModal
        id="tos-n-privacy-policy"
        isModalVisible={isTOSNPrivacyPolicyConfirmModalVisible}
        modalData={{
          title: t('common:COMMON.PLEASE_READ_AND_AGREE_THE_FIRST_TIME_YOU_LOGIN'),
          content: 'term_n_privacy',
          buttonText: t('common:COMMON.AGREE_WITH_TOS_N_PP'),
        }}
        infoModalVisibilityHandler={agreeWithInfomationConfirmModalVisibilityHandler}
        tosModalVisibilityHandler={TOSNPrivacyPolicyConfirmModalVisibilityHandler}
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
  return context;
};
