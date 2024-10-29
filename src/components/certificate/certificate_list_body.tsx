import React, { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import useStateRef from 'react-usestateref';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { useModalContext } from '@/contexts/modal_context';
import { CERTIFICATE_USER_INTERACT_OPERATION, InvoiceTabs } from '@/constants/certificate';
import { DISPLAY_LIST_VIEW_TYPE } from '@/constants/display';
import APIHandler from '@/lib/utils/api_handler';
import { getPusherInstance } from '@/lib/utils/pusher_client';
import { generateRandomCertificates, ICertificate, ICertificateUI } from '@/interfaces/certificate';
import { MessageType } from '@/interfaces/message_modal';
import { ToastType } from '@/interfaces/toastify';
import { IPaginatedData } from '@/interfaces/pagination';
import { IFileUIBeta } from '@/interfaces/file';
import { ProgressStatus } from '@/constants/account';
import { DEFAULT_PAGE_LIMIT, FREE_COMPANY_ID } from '@/constants/config';
import { SortBy, SortOrder } from '@/constants/sort';
import { ToastId } from '@/constants/toast_id';
import { APIName } from '@/constants/api_connection';
import { CERTIFICATE_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';
import Tabs from '@/components/tabs/tabs';
import FilterSection from '@/components/filter_section/filter_section';
import SelectionToolbar, {
  ISelectionToolBarOperation,
} from '@/components/selection_tool_bar/selection_tool_bar';
import Certificate from '@/components/certificate/certificate';
import CertificateEditModal from '@/components/certificate/certificate_edit_modal';
import FloatingUploadPopup from '@/components/floating_upload_popup/floating_upload_popup';
import CertificateQRCodeModal from '@/components/certificate/certificate_qrcode_modal';
import InvoiceUpload from '@/components/invoice_upload.tsx/invoice_upload';
import { InvoiceType } from '@/constants/invoice';
import { ISUNFA_ROUTE } from '@/constants/url';

interface CertificateListBodyProps {}

const sanitizeFileName = (fileName: string): string => {
  return encodeURIComponent(fileName);
};

const CertificateListBody: React.FC<CertificateListBodyProps> = () => {
  const { t } = useTranslation('certificate');
  const router = useRouter();
  const { selectedCompany } = useUserCtx();
  const companyId = selectedCompany?.id || FREE_COMPANY_ID;
  const params = { companyId: selectedCompany?.id };
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();
  const { trigger: encryptAPI } = APIHandler<string>(APIName.ENCRYPT);
  const { trigger: updateCertificateAPI } = APIHandler<ICertificate>(APIName.CERTIFICATE_PUT_V2);
  const { trigger: deleteCertificateAPI } = APIHandler<void>(APIName.CERTIFICATE_DELETE_V2);
  const { trigger: deleteCertificatesAPI } = APIHandler<void>(APIName.CERTIFICATE_DELETE_V2);
  const [token, setToken, tokenRef] = useStateRef<string | undefined>(undefined);
  const [showQRCode, setShowQRCode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<InvoiceTabs>(InvoiceTabs.WITHOUT_VOUCHER);
  const [certificates, setCertificates] = useState<{ [id: string]: ICertificateUI }>({});
  const [selectedCertificates, setSelectedCertificates] = useState<{
    [id: string]: ICertificateUI;
  }>({});
  const [totalInvoicePrice, setTotalInvoicePrice] = useState<number>(0);
  const [unRead, setUnRead] = useState<{
    withVoucher: number;
    withoutVoucher: number;
  }>({
    withVoucher: 0,
    withoutVoucher: 0,
  });
  const [activeSelection, setActiveSelection] = React.useState<boolean>(false);
  const [viewType, setViewType] = useState<DISPLAY_LIST_VIEW_TYPE>(DISPLAY_LIST_VIEW_TYPE.LIST);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSelectedAll, setIsSelectedAll] = useState<boolean>(false);
  const [mobileUploadFiles, setMobileUploadFiles] = useState<{
    [name: string]: IFileUIBeta;
  }>({});
  const [desktopUploadFiles, setDesktopUploadFiles] = useState<IFileUIBeta[]>([]);
  const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  const [amountSort, setAmountSort] = useState<null | SortOrder>(null);
  const [voucherSort, setVoucherSort] = useState<null | SortOrder>(null);
  const [otherSorts, setOtherSorts] = useState<{ sort: SortBy; sortOrder: SortOrder }[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [currency, setCurrency] = useState<string>('TWD');

  const handleAddVoucher = useCallback(() => {
    router.push({
      pathname: ISUNFA_ROUTE.ADD_NEW_VOUCHER,
    });
  }, [selectedCertificates]);

  const [addOperations, setAddOperations] = useState<ISelectionToolBarOperation[]>([
    {
      operation: CERTIFICATE_USER_INTERACT_OPERATION.ADD_VOUCHER,
      buttonStr: t('common:SELECTION.ADD_NEW_VOUCHER'),
      onClick: handleAddVoucher,
    },
  ]);

  const handleDownloadItem = useCallback(
    (id: number) => {
      const { file } = certificates[id];
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name || `image_${file.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [certificates]
  );

  const handleDownloadSelectedItems = useCallback(() => {
    Object.entries(certificates).forEach(([id, item]) => {
      if (item.isSelected) {
        handleDownloadItem(parseInt(id, 10));
      }
    });
  }, [certificates, activeTab, handleDownloadItem]);

  const [exportOperations] = useState<ISelectionToolBarOperation[]>([
    {
      operation: CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD,
      buttonStr: t('certificate:LIST.EXPORT_CERTIFICATES'),
      onClick: handleDownloadSelectedItems,
    },
  ]);

  const handleApiResponse = useCallback(
    (
      resData: IPaginatedData<{
        totalInvoicePrice: number;
        unRead: {
          withVoucher: number;
          withoutVoucher: number;
        };
        currency: string;
        certificates: ICertificate[];
      }>
    ) => {
      const dummyCertificateList = generateRandomCertificates(12);
      const dummyData = {
        data: {
          totalInvoicePrice: dummyCertificateList.reduce(
            (acc, item) => acc + item.invoice.totalPrice,
            0
          ),
          unRead: {
            withVoucher: 0,
            withoutVoucher: 3,
          },
          currency: 'TWD',
          certificates: dummyCertificateList,
        },
        page: 1,
        totalPages: 2,
        totalCount: 12,
        pageSize: 10,
        hasNextPage: true,
        hasPreviousPage: false,
        sort: [],
      };
      // Deprecated: (20241030 - tzuhan) Debugging purpose
      // eslint-disable-next-line no-param-reassign
      resData = dummyData;

      try {
        setTotalInvoicePrice(resData.data.totalInvoicePrice);
        setUnRead(resData.data.unRead);
        setTotalPages(resData.totalPages);
        setTotalCount(resData.totalCount);
        setPage(resData.page);
        setCurrency(resData.data.currency);

        const certificateData = resData.data.certificates.reduce(
          (acc, item) => {
            acc[item.id] = {
              ...item,
              isSelected: false,
              actions:
                activeTab === InvoiceTabs.WITHOUT_VOUCHER
                  ? [
                      CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD,
                      CERTIFICATE_USER_INTERACT_OPERATION.REMOVE,
                    ]
                  : [CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD],
            };
            return acc;
          },
          {} as { [id: number]: ICertificateUI }
        );
        setCertificates(certificateData);
      } catch (error) {
        toastHandler({
          id: ToastId.LIST_CERTIFICATE_ERROR,
          type: ToastType.ERROR,
          content: t('certificate:ERROR.WENT_WRONG'),
          closeable: true,
        });
      }
    },
    [activeTab]
  );

  const handleSelect = useCallback(
    (ids: number[], isSelected: boolean) => {
      const updatedData = {
        ...certificates,
      };
      if (ids.length === Object.keys(updatedData).length) {
        setIsSelectedAll(isSelected);
      } else {
        setIsSelectedAll(false);
      }
      const selectedData: { [id: string]: ICertificateUI } = {
        ...selectedCertificates,
      };
      ids.forEach((id) => {
        updatedData[id] = {
          ...updatedData[id],
          isSelected,
        };
        if (isSelected) {
          selectedData[id] = updatedData[id];
        } else {
          delete selectedData[id];
        }
      });
      localStorage.setItem('selectedCertificates', JSON.stringify(selectedData));
      setCertificates(updatedData);
      setSelectedCertificates(selectedData);
    },
    [certificates, activeTab, isSelectedAll]
  );

  const handleDeleteItem = useCallback(
    (id: number) => {
      messageModalDataHandler({
        title: t('certificate:DELETE.TITLE'),
        content: t('certificate:DELETE.CONTENT'),
        notes: `${certificates[id].invoice.name}?`,
        messageType: MessageType.WARNING,
        submitBtnStr: t('certificate:DELETE.YES'),
        submitBtnFunction: async () => {
          try {
            const { success } = await deleteCertificateAPI({
              params: { companyId, certificateId: id },
              query: { certificateId: id },
            });
            if (success) {
              toastHandler({
                id: ToastId.DELETE_CERTIFICATE_SUCCESS,
                type: ToastType.SUCCESS,
                content: t('certificate:DELETE.SUCCESS'),
                closeable: true,
              });
            } else throw new Error(t('certificate:DELETE.ERROR'));
          } catch (error) {
            toastHandler({
              id: ToastId.DELETE_CERTIFICATE_ERROR,
              type: ToastType.ERROR,
              content: t('certificate:ERROR.WENT_WRONG'),
              closeable: true,
            });
          }
        },
        backBtnStr: t('certificate:DELETE.NO'),
      });
      messageModalVisibilityHandler();
    },
    [certificates]
  );

  const handleDeleteSelectedItems = useCallback(() => {
    // Info: (20241025 - tzuhan) 找出所有選中的項目 ID
    const selectedIds = Object.keys(certificates).filter((id) => certificates[id].isSelected);

    // Info: (20241025 - tzuhan) 如果有選中的項目，顯示刪除確認模態框
    if (selectedIds.length > 0) {
      messageModalDataHandler({
        title: t('certificate:DELETE.TITLE'),
        content: t('certificate:DELETE.CONTENT_DELETE_MORE', { count: selectedIds.length }),
        messageType: MessageType.WARNING,
        submitBtnStr: t('certificate:DELETE.YES'),
        submitBtnFunction: async () => {
          try {
            // Info: (20241025 - tzuhan) 批量刪除選中的項目
            // Deprecated: (20240923 - tzuhan) debugging purpose
            // eslint-disable-next-line no-console
            console.log('Remove multiple ids:', selectedIds);

            const { success: deleteMultipleSuccess, code } = await deleteCertificatesAPI({
              params: { companyId },
              query: { certificateIds: selectedIds },
            });
            if (deleteMultipleSuccess) {
              // Info: (20241025 - tzuhan) 顯示刪除成功的提示
              toastHandler({
                id: ToastId.DELETE_CERTIFICATE_SUCCESS,
                type: ToastType.SUCCESS,
                content: t('certificate:DELETE.SUCCESS'),
                closeable: true,
              });
            } else {
              throw new Error(code);
            }
          } catch (error) {
            // Info: (20241025 - tzuhan) 顯示錯誤提示
            toastHandler({
              id: ToastId.DELETE_CERTIFICATE_ERROR,
              type: ToastType.ERROR,
              content: t('certificate:ERROR.WENT_WRONG'),
              closeable: true,
            });
          }
        },
        backBtnStr: t('certificate:DELETE.NO'),
      });

      // Info: (20241025 - tzuhan) 顯示確認刪除的模態框
      messageModalVisibilityHandler();
    }
  }, [
    certificates,
    activeTab,
    t,
    messageModalDataHandler,
    messageModalVisibilityHandler,
    toastHandler,
  ]);

  const onTabClick = useCallback(
    (tab: string) => {
      if ((tab as InvoiceTabs) === InvoiceTabs.WITHOUT_VOUCHER) {
        setAddOperations([
          {
            operation: CERTIFICATE_USER_INTERACT_OPERATION.ADD_VOUCHER,
            buttonStr: t('common:SELECTION.ADD_NEW_VOUCHER'),
            onClick: handleAddVoucher,
          },
        ]);
      } else {
        setAddOperations([]);
      }
      setActiveTab(tab as InvoiceTabs);
    },
    [activeTab, handleAddVoucher, handleDownloadSelectedItems]
  );

  const openEditModalHandler = useCallback(
    (id: number) => {
      setIsEditModalOpen(true);
      setEditingId(id);
    },
    [editingId]
  );

  const handleEditItem = useCallback(
    async (certificate: ICertificate) => {
      try {
        // Info: (20241025 - tzuhan) @Murky, 這邊跟目前後端的接口不一致，需要調整的話再跟我說
        const { success, data: updatedCertificate } = await updateCertificateAPI({
          params: { companyId, certificateId: certificate.id },
          body: certificate,
        });
        if (success && updatedCertificate) {
          const updatedData = {
            ...certificates,
            [certificate.id]: {
              ...updatedCertificate,
              isSelected: false,
              actions: [
                CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD,
                CERTIFICATE_USER_INTERACT_OPERATION.REMOVE,
              ],
            },
          };
          setCertificates(updatedData);
          toastHandler({
            id: ToastId.UPDATE_CERTIFICATE_SUCCESS,
            type: ToastType.SUCCESS,
            content: t('certificate:EDIT.SUCCESS'),
            closeable: true,
          });
        } else {
          toastHandler({
            id: ToastId.UPDATE_CERTIFICATE_ERROR,
            type: ToastType.ERROR,
            content: t('certificate:ERROR.WENT_WRONG'),
            closeable: true,
          });
        }
      } catch (error) {
        toastHandler({
          id: ToastId.UPDATE_CERTIFICATE_ERROR,
          type: ToastType.ERROR,
          content: t('certificate:ERROR.UPDATE_CERTIFICATE', { reason: (error as Error).message }),
          closeable: true,
        });
      }
    },
    [certificates, companyId]
  );

  const mobileUploadFileHandler = useCallback(
    async (message: { token: string; file: IFileUIBeta }) => {
      const { token: receivedToken, file } = message;
      // Deprecated: (20241011 - tzuhan) Debugging purpose
      // eslint-disable-next-line no-console
      console.log(
        `pusher got message, (token(${tokenRef.current})===_token${receivedToken})?${tokenRef.current === receivedToken} message:`,
        message
      );

      if (receivedToken === tokenRef.current) {
        const files = {
          ...mobileUploadFiles,
        };
        files[sanitizeFileName(file.name)] = { ...file };
        if (file.status === ProgressStatus.SUCCESS) {
          files[sanitizeFileName(file.name)].progress = 50;
          files[sanitizeFileName(file.name)].status = ProgressStatus.IN_PROGRESS;
        }
        setMobileUploadFiles(files);
        // Deprecated: (20241011 - tzuhan) Debugging purpose
        // eslint-disable-next-line no-console
        console.log(`mobileUploadFiles:`, mobileUploadFiles);
      }
    },
    [tokenRef, setMobileUploadFiles, mobileUploadFiles]
  );

  const certificateCreatedHandler = useCallback(
    (message: { certificate: ICertificate }) => {
      const { certificate: newCertificate } = message;
      if (
        (newCertificate.voucherNo && activeTab === InvoiceTabs.WITHOUT_VOUCHER) ||
        (!newCertificate.voucherNo && activeTab === InvoiceTabs.WITH_VOUCHER) ||
        newCertificate.companyId !== companyId
      ) {
        return;
      }

      const newCertificates = {
        ...certificates,
      };
      newCertificates[message.certificate.id] = {
        ...message.certificate,
        isSelected: false,
        unRead: true, // Info: (20241022 - tzuhan) @Murky, 目前 unRead 是在這裡設置的，之後應該要改成後端推送
        actions: !message.certificate.voucherNo
          ? [
              CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD,
              CERTIFICATE_USER_INTERACT_OPERATION.REMOVE,
            ]
          : [CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD],
      };
      setCertificates(newCertificates);
    },
    [companyId, certificates, activeTab]
  );

  const getToken = useCallback(async () => {
    if (!tokenRef.current) {
      const res = await encryptAPI({ body: { companyId } });
      if (res.success && res.data) {
        setToken(res.data);
      } else {
        setToken('');
      }
    }
  }, [tokenRef, companyId, setToken]);

  const toggleQRCode = useCallback(() => {
    getToken();
    setShowQRCode((prev) => !prev);
  }, []);

  useEffect(() => {
    setOtherSorts([
      ...(amountSort ? [{ sort: SortBy.AMOUNT, sortOrder: amountSort }] : []),
      ...(voucherSort ? [{ sort: SortBy.VOUCHER_NUMBER, sortOrder: voucherSort }] : []),
    ]);
  }, [amountSort, voucherSort]);

  useEffect(() => {
    getToken();
  }, [getToken]);

  useEffect(() => {
    const pusher = getPusherInstance();
    const channel = pusher.subscribe(PRIVATE_CHANNEL.CERTIFICATE);

    channel.bind(CERTIFICATE_EVENT.UPLOAD, mobileUploadFileHandler);
    // Info: (20241022 - tzuhan) @Murky, 這裡是前端訂閱 PUSHER (CERTIFICATE_EVENT.CREATE) 的地方，當生成新的 certificate 要新增到列表中
    channel.bind(CERTIFICATE_EVENT.CREATE, certificateCreatedHandler);

    return () => {
      channel.unbind(CERTIFICATE_EVENT.UPLOAD, mobileUploadFileHandler);
      channel.unbind(CERTIFICATE_EVENT.CREATE, certificateCreatedHandler);
      pusher.unsubscribe(PRIVATE_CHANNEL.CERTIFICATE);
    };
  }, []);

  return (
    <>
      {isEditModalOpen && (
        <CertificateEditModal
          isOpen={isEditModalOpen}
          companyId={companyId}
          toggleIsEditModalOpen={setIsEditModalOpen}
          certificate={editingId ? certificates[editingId] : undefined}
          onSave={handleEditItem}
          onDelete={handleDeleteItem}
        />
      )}
      {showQRCode && !!token && (
        <CertificateQRCodeModal
          isOpen={showQRCode}
          onClose={() => setShowQRCode((prev) => !prev)}
          isOnTopOfModal={false}
          token={tokenRef.current!}
        />
      )}
      {/* Info: (20240919 - tzuhan) Main Content */}
      <div
        className={`flex grow flex-col gap-4 ${certificates && Object.values(certificates).length > 0 ? 'overflow-y-scroll' : ''} `}
      >
        {/* Info: (20240919 - tzuhan) Upload Area */}
        <InvoiceUpload
          isDisabled={false}
          withScanner
          toggleQRCode={toggleQRCode}
          setFiles={setDesktopUploadFiles}
          showErrorMessage={false}
        />
        {/* Info: (20240919 - tzuhan) Tabs */}
        <Tabs
          tabs={Object.values(InvoiceTabs)}
          tabsString={[t('certificate:TAB.WITHOUT_VOUCHER'), t('certificate:TAB.WITH_VOUCHER')]}
          activeTab={activeTab}
          onTabClick={onTabClick}
          counts={unRead ? [unRead.withoutVoucher, unRead.withVoucher] : [0, 0]}
        />

        {/* Info: (20240919 - tzuhan) Filter Section */}
        <FilterSection<{
          totalInvoicePrice: number;
          unRead: {
            withVoucher: number;
            withoutVoucher: number;
          };
          currency: string;
          certificates: ICertificate[];
        }>
          className="mt-2"
          params={params}
          apiName={APIName.CERTIFICATE_LIST_V2}
          onApiResponse={handleApiResponse}
          page={page}
          pageSize={DEFAULT_PAGE_LIMIT}
          tab={activeTab}
          types={Object.values(InvoiceType)}
          viewType={viewType}
          viewToggleHandler={setViewType}
          dateSort={dateSort}
          // setDateSort={setDateSort} // Info: (20241024 - tzuhan) UI 更新後不再需要
          otherSorts={otherSorts}
        />

        {/* Info: (20240919 - tzuhan) Certificate Table */}
        {certificates && Object.values(certificates).length > 0 ? (
          <>
            <SelectionToolbar
              className="mt-6"
              active={activeSelection}
              isSelectable={activeTab === InvoiceTabs.WITHOUT_VOUCHER}
              onActiveChange={setActiveSelection}
              items={Object.values(certificates)}
              subtitle={`${t('certificate:LIST.INVOICE_TOTAL_PRRICE')}:`}
              totalPrice={totalInvoicePrice}
              currency={currency}
              selectedCount={Object.values(selectedCertificates).length}
              totalCount={Object.values(certificates).length || 0}
              handleSelect={handleSelect}
              addOperations={addOperations}
              exportOperations={exportOperations}
              onDelete={handleDeleteSelectedItems}
            />
            <Certificate
              activeTab={activeTab}
              page={page}
              setPage={setPage}
              totalPages={totalPages}
              totalCount={totalCount}
              certificates={Object.values(certificates)}
              viewType={viewType}
              activeSelection={activeSelection}
              handleSelect={handleSelect}
              isSelectedAll={isSelectedAll}
              onDownload={handleDownloadItem}
              onRemove={handleDeleteItem}
              onEdit={openEditModalHandler}
              dateSort={dateSort}
              amountSort={amountSort}
              voucherSort={voucherSort}
              setDateSort={setDateSort}
              setAmountSort={setAmountSort}
              setVoucherSort={setVoucherSort}
            />
          </>
        ) : (
          <div className="flex flex-auto items-center justify-center">
            <Image src="/elements/empty_list.svg" alt="empty" width={120} height={135} />
          </div>
        )}
      </div>
      {/* Info: (20240926- tzuhan) Floating Upload Popup */}
      <FloatingUploadPopup
        companyId={companyId}
        mobileUploadFiles={Object.values(mobileUploadFiles)}
        desktopUploadFiles={desktopUploadFiles}
      />
    </>
  );
};

export default CertificateListBody;
