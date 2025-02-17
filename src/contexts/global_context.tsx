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
import { useTranslation } from 'next-i18next';
import AddAccountTitleModal from '@/components/add_account_title_modal/add_account_title_modal';
import EditAccountTitleModal from '@/components/edit_account_title_modal/edit_account_title_modal';
import TeamSettingModal from '@/components/team_setting_modal/team_setting_modal';
import TransferCompanyModal from '@/components/transfer_company_modal/transfer_company_modal';
import { UploadType } from '@/constants/file';
import { useModalContext } from '@/contexts/modal_context';
import ExportVoucherModal from '@/components/export_voucher_modal/export_voucher_modal';
import AssetStatusSettingModal from '@/components/asset_status_setting_modal/asset_status_setting_modal';
import { IAssetModal, initialAssetModal } from '@/interfaces/asset_modal';
import SelectReverseItemsModal from '@/components/voucher/select_reverse_items_modal';
import { IReverseItemModal, defaultReverseItemModal } from '@/interfaces/reverse';
import AccountingTitleSettingModal from '@/components/account_settings/accounting_title_setting_modal';
import ManualAccountOpeningModal from '@/components/account_settings/manual_account_opening_modal';
import AddCounterPartyModal from '@/components/counterparty/add_counterparty_modal';

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
  selectReverseDataHandler: (data: IReverseItemModal) => void;

  isAccountingTitleSettingModalVisible: boolean;
  accountingTitleSettingModalVisibilityHandler: () => void;

  isManualAccountOpeningModalVisible: boolean;
  manualAccountOpeningModalVisibilityHandler: () => void;
}

export interface IGlobalProvider {
  children: React.ReactNode;
}

const GlobalContext = createContext<IGlobalContext | undefined>(undefined);

export const GlobalProvider = ({ children }: IGlobalProvider) => {
  const { t } = useTranslation(['common', 'reports']);
  const router = useRouter();
  const { pathname } = router;
  const { isSignIn } = useUserCtx();
  const { reportGeneratedStatus, reportPendingStatus, reportGeneratedStatusHandler } =
    useNotificationCtx();

  const {
    toastHandler,
    isMessageModalVisible,
    messageModalVisibilityHandler,
    messageModalData,
    isConfirmModalVisible,
    confirmModalVisibilityHandler,
    isAddBookmarkModalVisible,
    addBookmarkModalVisibilityHandler,
    isAddCounterPartyModalVisible,
    addCounterPartyModalVisibilityHandler,
    addCounterPartyModalData,
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

  const [isExportVoucherModalVisible, setIsExportVoucherModalVisible] = useState(false);

  const [isAssetStatusSettingModalVisible, setIsAssetStatusSettingModalVisible] = useState(false);
  const [updateAssetId, setUpdateAssetId] = useState('');
  const [defaultStatus, setDefaultStatus] = useState('');

  const [isSelectReverseItemsModalVisible, setIsSelectReverseItemsModalVisible] = useState(false);
  const [selectedReverseData, setSelectedReverseData] =
    useState<IReverseItemModal>(defaultReverseItemModal);

  const [isAccountingTitleSettingModalVisible, setIsAccountingTitleSettingModalVisible] =
    useState(false);

  const [isManualAccountOpeningModalVisible, setIsManualAccountOpeningModalVisible] =
    useState(false);

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

  const selectReverseDataHandler = (data: IReverseItemModal) => {
    setSelectedReverseData(data);
  };

  const accountingTitleSettingModalVisibilityHandler = () => {
    setIsAccountingTitleSettingModalVisible(!isAccountingTitleSettingModalVisible);
  };

  const manualAccountOpeningModalVisibilityHandler = () => {
    setIsManualAccountOpeningModalVisible(!isManualAccountOpeningModalVisible);
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
            <p>{t('reports:AUDIT_REPORT.YOUR_REPORT_IS_DONE')}</p>
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

      isAccountingTitleSettingModalVisible,
      accountingTitleSettingModalVisibilityHandler,

      isManualAccountOpeningModalVisible,
      manualAccountOpeningModalVisibilityHandler,
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

      isAccountingTitleSettingModalVisible,
      accountingTitleSettingModalVisibilityHandler,

      isManualAccountOpeningModalVisible,
      manualAccountOpeningModalVisibilityHandler,
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

      <AddCounterPartyModal
        isModalVisible={isAddCounterPartyModalVisible}
        modalVisibilityHandler={addCounterPartyModalVisibilityHandler}
        //  onClose={addCounterPartyModalData.onClose}
        onSave={addCounterPartyModalData.onSave}
        name={addCounterPartyModalData.name}
        taxId={addCounterPartyModalData.taxId}
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
        modalData={selectedReverseData}
      />

      <AccountingTitleSettingModal
        isModalVisible={isAccountingTitleSettingModalVisible}
        modalVisibilityHandler={accountingTitleSettingModalVisibilityHandler}
      />

      <ManualAccountOpeningModal
        isModalVisible={isManualAccountOpeningModalVisible}
        modalVisibilityHandler={manualAccountOpeningModalVisibilityHandler}
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
