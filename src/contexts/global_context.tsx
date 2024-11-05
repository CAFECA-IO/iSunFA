import React, { useState, useContext, createContext, useMemo, useEffect } from 'react';
import { DUMMY_FILTER_OPTIONS, FilterOptionsModalType, IFilterOptions } from '@/interfaces/modals';
import PasskeySupportModal from '@/components/passkey_support_modal/passkey_support_modal';
import MessageModal from '@/components/message_modal/message_modal';
import useWindowSize from '@/lib/hooks/use_window_size';
import { LAYOUT_BREAKPOINT } from '@/constants/display';
import { LayoutAssertion } from '@/interfaces/layout_assertion';
import ConfirmModal from '@/components/confirm_modal/confirm_modal';
import AddAssetModal from '@/components/asset/add_asset_modal';
import CameraScanner from '@/components/camera_scanner/camera_scanner';
import PreviewInvoiceModal from '@/components/preview_invoice_modal/preview_invoice_modal';
import {
  IPreviewInvoiceModal,
  dummyPreviewInvoiceModalData,
} from '@/interfaces/preview_invoice_modal';
import EmbedCodeModal from '@/components/embed_code_modal/embed_code_modal';
import Toast from '@/components/toast/toast';
import { ToastPosition, ToastType } from '@/interfaces/toastify';
import CreateCompanyModal from '@/components/create_company_modal/create_company_modal';
import CompanyInvitationModal from '@/components/company_invitation_modal/company_invitation_modal';
import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useRouter } from 'next/router';
import LoadingModal from '@/components/loading_modal/loading_modal';
import { IConfirmModal, dummyConfirmModalData } from '@/interfaces/confirm_modal';
import FilterOptionsModal from '@/components/filter_options_modal/filter_options_modal';
import AddProjectModal from '@/components/add_project_modal/add_project_modal';
import { useUserCtx } from '@/contexts/user_context';
import { useNotificationCtx } from '@/contexts/notification_context';
import { ProjectStage } from '@/constants/project';
import EditBookmarkModal from '@/components/edit_bookmark_modal/edit_bookmark_modal';
import ProfileUploadModal from '@/components/profile_upload_modal/profile_upload_modal';
import SalaryBookConfirmModal from '@/components/salary_book_confirm_modal/salary_book_confirm_modal';
import { ToastId } from '@/constants/toast_id';
import { useTranslation } from 'next-i18next';
import AddAccountTitleModal from '@/components/add_account_title_modal/add_account_title_modal';
import EditAccountTitleModal from '@/components/edit_account_title_modal/edit_account_title_modal';
import TeamSettingModal from '@/components/team_setting_modal/team_setting_modal';
import TransferCompanyModal from '@/components/transfer_company_modal/transfer_company_modal';
import { UploadType } from '@/constants/file';
import LoginConfirmModal from '@/components/login_confirm_modal/login_confirm_modal';
import { useModalContext } from '@/contexts/modal_context';
import ExportVoucherModal from '@/components/export_voucher_modal/export_voucher_modal';
import AssetStatusSettingModal from '@/components/asset_status_setting_modal/asset_status_setting_modal';
import { IAssetModal, initialAssetModal } from '@/interfaces/asset_modal';
import SelectReverseItemsModal from '@/components/voucher/select_reverse_items_modal';

interface IGlobalContext {
  width: number;
  height: number;
  layoutAssertion: LayoutAssertion;

  isPasskeySupportModalVisible: boolean;
  passKeySupportModalVisibilityHandler: () => void;

  confirmModalData: IConfirmModal;
  confirmModalDataHandler: (data: IConfirmModal) => void;

  isAddAssetModalVisible: boolean;
  addAssetModalVisibilityHandler: () => void;
  addAssetModalDataHandler: (defaultAssetData: IAssetModal) => void;

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

  isExportVoucherModalVisible: boolean;
  exportVoucherModalVisibilityHandler: () => void;

  isAssetStatusSettingModalVisible: boolean;
  assetStatusSettingModalVisibilityHandler: () => void;
  assetStatusSettingModalDataHandler: (assetId: string, status: string) => void;

  isSelectReverseItemsModalVisible: boolean;
  selectReverseItemsModalVisibilityHandler: () => void;
  selectReverseDataHandler: (data: string) => void;

  termsOfServiceConfirmModalVisibilityHandler: (visibility: boolean) => void;
}

export interface IGlobalProvider {
  children: React.ReactNode;
}

const GlobalContext = createContext<IGlobalContext | undefined>(undefined);

export const GlobalProvider = ({ children }: IGlobalProvider) => {
  const { t } = useTranslation(['common', 'report_401']);
  const router = useRouter();
  const { pathname } = router;

  const { isSignIn, selectedCompany, isAgreeTermsOfService, isAgreePrivacyPolicy } = useUserCtx();
  const { reportGeneratedStatus, reportPendingStatus, reportGeneratedStatusHandler } =
    useNotificationCtx();

  const {
    toastHandler,
    eliminateToast,
    isMessageModalVisible,
    messageModalVisibilityHandler,
    messageModalData,
    isConfirmModalVisible,
    confirmModalVisibilityHandler,
    isAddBookmarkModalVisible,
    addBookmarkModalVisibilityHandler,
  } = useModalContext();

  const windowSize = useWindowSize();
  const [isPasskeySupportModalVisible, setIsPasskeySupportModalVisible] = useState(false);

  const [confirmModalData, setConfirmModalData] = useState<IConfirmModal>(dummyConfirmModalData);

  const [isAddAssetModalVisible, setIsAddAssetModalVisible] = useState(false);
  const [defaultAssetData, setDefaultAssetData] = useState<IAssetModal>(initialAssetModal);

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

  const [isTermsOfServiceConfirmModalVisible, setIsTermsOfServiceConfirmModalVisible] =
    useState(false);

  const [isPrivacyPolicyConfirmModalVisible, setIsPrivacyPolicyConfirmModalVisible] =
    useState(false);

  const [isExportVoucherModalVisible, setIsExportVoucherModalVisible] = useState(false);

  const [isAssetStatusSettingModalVisible, setIsAssetStatusSettingModalVisible] = useState(false);
  const [updateAssetId, setUpdateAssetId] = useState('');
  const [defaultStatus, setDefaultStatus] = useState('');

  const [isSelectReverseItemsModalVisible, setIsSelectReverseItemsModalVisible] = useState(false);
  const [selectedReverseData, setSelectedReverseData] = useState('');

  const { width, height } = windowSize;

  const layoutAssertion = useMemo(() => {
    return width < LAYOUT_BREAKPOINT ? LayoutAssertion.MOBILE : LayoutAssertion.DESKTOP;
  }, [width]);

  const passKeySupportModalVisibilityHandler = () => {
    setIsPasskeySupportModalVisible(!isPasskeySupportModalVisible);
  };

  const confirmModalDataHandler = (data: IConfirmModal) => {
    setConfirmModalData(data);
  };

  const addAssetModalVisibilityHandler = () => {
    setIsAddAssetModalVisible(!isAddAssetModalVisible);
  };
  const addAssetModalDataHandler = (assetData: IAssetModal) => {
    setDefaultAssetData(assetData);
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

  const termsOfServiceConfirmModalVisibilityHandler = (visibility: boolean) => {
    setIsTermsOfServiceConfirmModalVisible(visibility);
  };

  const privacyPolicyConfirmModalVisibilityHandler = (visibility: boolean) => {
    setIsPrivacyPolicyConfirmModalVisible(visibility);
  };

  const exportVoucherModalVisibilityHandler = () => {
    setIsExportVoucherModalVisible(!isExportVoucherModalVisible);
  };

  const assetStatusSettingModalVisibilityHandler = () => {
    setIsAssetStatusSettingModalVisible(!isAssetStatusSettingModalVisible);
  };

  const assetStatusSettingModalDataHandler = (assetId: string, status: string) => {
    setUpdateAssetId(assetId);
    setDefaultStatus(status);
  };

  const selectReverseItemsModalVisibilityHandler = () => {
    setIsSelectReverseItemsModalVisible(!isSelectReverseItemsModalVisible);
  };

  const selectReverseDataHandler = (data: string) => {
    setSelectedReverseData(data);
  };

  useEffect(() => {
    if (!isSignIn) return;

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
  }, [reportPendingStatus, reportGeneratedStatus, isSignIn, pathname]);

  useEffect(() => {
    if (isSignIn) {
      if (!isAgreeTermsOfService || !isAgreePrivacyPolicy) {
        if (router.pathname !== ISUNFA_ROUTE.LOGIN) router.push(ISUNFA_ROUTE.LOGIN);
        if (!isAgreeTermsOfService) termsOfServiceConfirmModalVisibilityHandler(true);
        if (isAgreeTermsOfService && !isAgreePrivacyPolicy) {
          privacyPolicyConfirmModalVisibilityHandler(true);
        }
      } else {
        termsOfServiceConfirmModalVisibilityHandler(false);
        privacyPolicyConfirmModalVisibilityHandler(false);
      }
    }
  }, [pathname, isSignIn, isAgreeTermsOfService, isAgreePrivacyPolicy]);

  useEffect(() => {
    if (isSignIn) {
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
      // Info: (20240909 - Anna) 為了不顯示「Alpha 版本的資料只用於測試」這個彈窗，所以先註解掉，未來需要用到時再解開
      // if (router.pathname.includes(ISUNFA_ROUTE.LOGIN)) {
      //   toastHandler({
      //     id: ToastId.ALPHA_TEST_REMINDER,
      //     type: ToastType.INFO,
      //     closeable: true,
      //     autoClose: false,
      //     content: (
      //       <div className="flex items-center justify-between">
      //         <p className="font-barlow text-sm">{t('common:COMMON.ALPHA_TEST_REMINDER')}</p>
      //       </div>
      //     ),
      //   });
      // } else {
      //   eliminateToast(ToastId.ALPHA_TEST_REMINDER);
      // }
    }
  }, [pathname, isSignIn]);

  // Info: (20240830 - Anna) 為了拿掉react/jsx-no-constructed-context-values註解，所以使用useMemo hook

  const value = useMemo(
    () => ({
      width,
      height,
      layoutAssertion,
      isPasskeySupportModalVisible,
      passKeySupportModalVisibilityHandler,
      confirmModalData,
      confirmModalDataHandler,
      isAddAssetModalVisible,
      addAssetModalVisibilityHandler,
      addAssetModalDataHandler,
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

      isExportVoucherModalVisible,
      exportVoucherModalVisibilityHandler,

      isAssetStatusSettingModalVisible,
      assetStatusSettingModalVisibilityHandler,
      assetStatusSettingModalDataHandler,

      isSelectReverseItemsModalVisible,
      selectReverseItemsModalVisibilityHandler,
      selectReverseDataHandler,

      termsOfServiceConfirmModalVisibilityHandler,
    }),
    [
      width,
      height,
      layoutAssertion,
      isPasskeySupportModalVisible,
      passKeySupportModalVisibilityHandler,
      confirmModalData,
      confirmModalDataHandler,
      isAddAssetModalVisible,
      addAssetModalVisibilityHandler,
      addAssetModalDataHandler,
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

      isExportVoucherModalVisible,
      exportVoucherModalVisibilityHandler,

      isAssetStatusSettingModalVisible,
      assetStatusSettingModalVisibilityHandler,
      assetStatusSettingModalDataHandler,

      isSelectReverseItemsModalVisible,
      selectReverseItemsModalVisibilityHandler,
      selectReverseDataHandler,

      termsOfServiceConfirmModalVisibilityHandler,
    ]
  );

  return (
    <GlobalContext.Provider value={value}>
      <PasskeySupportModal
        isModalVisible={isPasskeySupportModalVisible}
        modalVisibilityHandler={passKeySupportModalVisibilityHandler}
      />

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
        defaultData={defaultAssetData}
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
        id="agree-to-our-terms-of-service"
        isModalVisible={isTermsOfServiceConfirmModalVisible}
        modalData={{
          title: t('common:COMMON.PLEASE_READ_AND_AGREE_THE_FIRST_TIME_YOU_LOGIN'),
          content: 'terms_of_service',
          buttonText: t('common:COMMON.AGREE_TO_OUR_TERMS_OF_SERVICE'),
        }}
        infoModalVisibilityHandler={termsOfServiceConfirmModalVisibilityHandler}
        tosModalVisibilityHandler={privacyPolicyConfirmModalVisibilityHandler}
      />
      <LoginConfirmModal
        id="agree-to-our-privacy-policy"
        isModalVisible={isPrivacyPolicyConfirmModalVisible}
        modalData={{
          title: t('common:COMMON.PLEASE_READ_AND_AGREE_THE_FIRST_TIME_YOU_LOGIN'),
          content: 'privacy_policy',
          buttonText: t('common:COMMON.AGREE_TO_OUR_PRIVACY_POLICY'),
        }}
        infoModalVisibilityHandler={termsOfServiceConfirmModalVisibilityHandler}
        tosModalVisibilityHandler={privacyPolicyConfirmModalVisibilityHandler}
      />

      <ExportVoucherModal
        isModalVisible={isExportVoucherModalVisible}
        modalVisibilityHandler={exportVoucherModalVisibilityHandler}
      />

      <AssetStatusSettingModal
        isModalVisible={isAssetStatusSettingModalVisible}
        modalVisibilityHandler={assetStatusSettingModalVisibilityHandler}
        updateAssetId={updateAssetId}
        defaultStatus={defaultStatus}
      />

      <SelectReverseItemsModal
        isModalVisible={isSelectReverseItemsModalVisible}
        modalVisibilityHandler={selectReverseItemsModalVisibilityHandler}
        accounting={selectedReverseData}
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
