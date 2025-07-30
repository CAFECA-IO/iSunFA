import React, { useState, useContext, createContext, useMemo, useEffect } from 'react';
import { DUMMY_FILTER_OPTIONS, FilterOptionsModalType, IFilterOptions } from '@/interfaces/modals';
import PasskeySupportModal from '@/components/passkey_support_modal/passkey_support_modal';
import MessageModal from '@/components/message_modal/message_modal';
import useWindowSize from '@/lib/hooks/use_window_size';
import { LAYOUT_BREAKPOINT } from '@/constants/display';
import { LayoutAssertion } from '@/interfaces/layout_assertion';
import AddAssetModal from '@/components/asset/add_asset_modal';
import EmbedCodeModal from '@/components/embed_code_modal/embed_code_modal_new';
import Toast from '@/components/toast/toast';
import { ToastPosition, ToastType } from '@/interfaces/toastify';
import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useRouter } from 'next/router';
import FilterOptionsModal from '@/components/filter_options_modal/filter_options_modal';
import { useUserCtx } from '@/contexts/user_context';
import { useNotificationCtx } from '@/contexts/notification_context';
import ProfileUploadModal from '@/components/profile_upload_modal/profile_upload_modal';
import { useTranslation } from 'next-i18next';
import { UploadType } from '@/constants/file';
import { useModalContext } from '@/contexts/modal_context';
import ExportVoucherModal from '@/components/export_voucher_modal/export_voucher_modal';
import AssetStatusSettingModal from '@/components/asset_status_setting_modal/asset_status_setting_modal';
import { IAssetModal, initialAssetModal } from '@/interfaces/asset_modal';
import SelectReverseItemsModal from '@/components/voucher/select_reverse_items_modal';
import { IReverseItemModal, defaultReverseItemModal } from '@/interfaces/reverse';
import ManualAccountOpeningModal from '@/components/general/account_settings/manual_account_opening_modal';
import AddCounterPartyModal from '@/components/counterparty/add_counterparty_modal';

interface IGlobalContext {
  width: number;
  height: number;
  layoutAssertion: LayoutAssertion;

  isPasskeySupportModalVisible: boolean;
  passKeySupportModalVisibilityHandler: () => void;

  isAddAssetModalVisible: boolean;
  addAssetModalVisibilityHandler: () => void;
  addAssetModalDataHandler: (defaultAssetData: IAssetModal) => void;

  isEmbedCodeModalVisible: boolean;
  embedCodeModalVisibilityHandler: () => void;

  profileUploadModalVisible: boolean;
  profileUploadModalVisibilityHandler: () => void;
  profileUploadModalDataHandler: (type: UploadType) => void;

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

  isExportVoucherModalVisible: boolean;
  exportVoucherModalVisibilityHandler: () => void;

  isAssetStatusSettingModalVisible: boolean;
  assetStatusSettingModalVisibilityHandler: () => void;
  assetStatusSettingModalDataHandler: (assetId: string, status: string) => void;

  isSelectReverseItemsModalVisible: boolean;
  selectReverseItemsModalVisibilityHandler: () => void;
  selectReverseDataHandler: (data: IReverseItemModal) => void;

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
    isAddCounterPartyModalVisible,
    addCounterPartyModalVisibilityHandler,
    addCounterPartyModalData,
  } = useModalContext();

  const windowSize = useWindowSize();
  const [isPasskeySupportModalVisible, setIsPasskeySupportModalVisible] = useState(false);

  const [isAddAssetModalVisible, setIsAddAssetModalVisible] = useState(false);
  const [defaultAssetData, setDefaultAssetData] = useState<IAssetModal>(initialAssetModal);

  const [isEmbedCodeModalVisible, setIsEmbedCodeModalVisible] = useState(false);

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

  const [profileUploadModalVisible, setProfileUploadModalVisible] = useState(false);
  const [uploadImageType, setUploadImageType] = useState<UploadType>(UploadType.USER);

  const [isExportVoucherModalVisible, setIsExportVoucherModalVisible] = useState(false);

  const [isAssetStatusSettingModalVisible, setIsAssetStatusSettingModalVisible] = useState(false);
  const [updateAssetId, setUpdateAssetId] = useState('');
  const [defaultStatus, setDefaultStatus] = useState('');

  const [isSelectReverseItemsModalVisible, setIsSelectReverseItemsModalVisible] = useState(false);
  const [selectedReverseData, setSelectedReverseData] =
    useState<IReverseItemModal>(defaultReverseItemModal);

  const [isManualAccountOpeningModalVisible, setIsManualAccountOpeningModalVisible] =
    useState(false);

  const { width, height } = windowSize;

  const layoutAssertion = useMemo(() => {
    return width < LAYOUT_BREAKPOINT ? LayoutAssertion.MOBILE : LayoutAssertion.DESKTOP;
  }, [width]);

  const passKeySupportModalVisibilityHandler = () => {
    setIsPasskeySupportModalVisible(!isPasskeySupportModalVisible);
  };

  const addAssetModalVisibilityHandler = () => {
    setIsAddAssetModalVisible(!isAddAssetModalVisible);
  };
  const addAssetModalDataHandler = (assetData: IAssetModal) => {
    setDefaultAssetData(assetData);
  };

  const embedCodeModalVisibilityHandler = () => {
    setIsEmbedCodeModalVisible(!isEmbedCodeModalVisible);
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

  const profileUploadModalVisibilityHandler = () => {
    setProfileUploadModalVisible(!profileUploadModalVisible);
  };

  const profileUploadModalDataHandler = (type: UploadType) => {
    setUploadImageType(type);
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
      isAddAssetModalVisible,
      addAssetModalVisibilityHandler,
      addAssetModalDataHandler,
      isEmbedCodeModalVisible,
      embedCodeModalVisibilityHandler,

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
      profileUploadModalVisible,
      profileUploadModalVisibilityHandler,
      profileUploadModalDataHandler,

      isExportVoucherModalVisible,
      exportVoucherModalVisibilityHandler,

      isAssetStatusSettingModalVisible,
      assetStatusSettingModalVisibilityHandler,
      assetStatusSettingModalDataHandler,

      isSelectReverseItemsModalVisible,
      selectReverseItemsModalVisibilityHandler,
      selectReverseDataHandler,

      isManualAccountOpeningModalVisible,
      manualAccountOpeningModalVisibilityHandler,
    }),
    [
      width,
      height,
      layoutAssertion,
      isPasskeySupportModalVisible,
      passKeySupportModalVisibilityHandler,
      isAddAssetModalVisible,
      addAssetModalVisibilityHandler,
      addAssetModalDataHandler,
      isEmbedCodeModalVisible,
      embedCodeModalVisibilityHandler,

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

      profileUploadModalVisible,
      profileUploadModalVisibilityHandler,
      profileUploadModalDataHandler,

      isExportVoucherModalVisible,
      exportVoucherModalVisibilityHandler,

      isAssetStatusSettingModalVisible,
      assetStatusSettingModalVisibilityHandler,
      assetStatusSettingModalDataHandler,

      isSelectReverseItemsModalVisible,
      selectReverseItemsModalVisibilityHandler,
      selectReverseDataHandler,

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

      <AddAssetModal
        isModalVisible={isAddAssetModalVisible}
        modalVisibilityHandler={addAssetModalVisibilityHandler}
        defaultData={defaultAssetData}
      />

      <EmbedCodeModal
        isModalVisible={isEmbedCodeModalVisible}
        modalVisibilityHandler={embedCodeModalVisibilityHandler}
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

      <ProfileUploadModal
        isModalVisible={profileUploadModalVisible}
        modalVisibilityHandler={profileUploadModalVisibilityHandler}
        uploadType={uploadImageType}
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
