import React, { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { useModalContext } from '@/contexts/modal_context';
import { CERTIFICATE_USER_INTERACT_OPERATION, InvoiceTabs } from '@/constants/certificate';
import { DISPLAY_LIST_VIEW_TYPE } from '@/constants/display';
import APIHandler from '@/lib/utils/api_handler';
import { ICertificate, ICertificateUI } from '@/interfaces/certificate';
import { MessageType } from '@/interfaces/message_modal';
import { ToastType } from '@/interfaces/toastify';
import { IPaginatedData } from '@/interfaces/pagination';
import { DEFAULT_PAGE_LIMIT, FREE_COMPANY_ID } from '@/constants/config';
import { SortBy, SortOrder } from '@/constants/sort';
import { ToastId } from '@/constants/toast_id';
import { APIName } from '@/constants/api_connection';
import Tabs from '@/components/tabs/tabs';
import FilterSection from '@/components/filter_section/filter_section';
import SelectionToolbar, {
  ISelectionToolBarOperation,
} from '@/components/selection_tool_bar/selection_tool_bar';
import Certificate from '@/components/certificate/certificate';
import CertificateEditModal from '@/components/certificate/certificate_edit_modal';
import { InvoiceType } from '@/constants/invoice';
import { ISUNFA_ROUTE } from '@/constants/url';
import CertificateExportModal from '@/components/certificate/certificate_export_modal';
import CertificateFileUpload from '@/components/certificate/certificate_file_upload';
import { getPusherInstance } from '@/lib/utils/pusher_client';
import { CERTIFICATE_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';
import { CurrencyType } from '@/constants/currency';
import FloatingUploadPopup from '@/components/floating_upload_popup/floating_upload_popup';
import { ProgressStatus } from '@/constants/account';
import { IFileUIBeta } from '@/interfaces/file';

interface CertificateListBodyProps {}

const CertificateListBody: React.FC<CertificateListBodyProps> = () => {
  const { t } = useTranslation(['certificate']);
  const router = useRouter();
  const { userAuth, selectedAccountBook } = useUserCtx();
  const companyId = selectedAccountBook?.id || FREE_COMPANY_ID;
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();
  const { trigger: updateInvoiceAPI } = APIHandler<ICertificate>(APIName.INVOICE_PUT_V2);
  const { trigger: createInvoiceAPI } = APIHandler<ICertificate>(APIName.INVOICE_POST_V2);
  const { trigger: deleteCertificatesAPI } = APIHandler<number[]>(
    APIName.CERTIFICATE_DELETE_MULTIPLE_V2
  ); // Info: (20241128 - Murky) @tzuhan 這邊會回傳成功被刪掉的certificate

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
  const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  const [amountSort, setAmountSort] = useState<null | SortOrder>(null);
  const [voucherSort, setVoucherSort] = useState<null | SortOrder>(null);
  const [selectedSort, setSelectedSort] = useState<
    | {
        by: SortBy;
        order: SortOrder;
      }
    | undefined
  >();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [currency, setCurrency] = useState<CurrencyType>(CurrencyType.TWD);
  const [files, setFiles] = useState<IFileUIBeta[]>([]);

  // Info: (20241204 - tzuhan) 通用文件狀態更新函數
  const updateFileStatus = (
    fileId: number | null,
    fileName: string,
    status: ProgressStatus,
    progress?: number,
    certificateId?: number
  ) => {
    const update = (f: IFileUIBeta) => ({
      ...f,
      status,
      progress: progress ?? f.progress,
      certificateId,
    });
    setFiles((prev) =>
      prev.map((f) => ((f.id && fileId && f.id === fileId) || f.name === fileName ? update(f) : f))
    );
  };

  // Info: (20241204 - tzuhan) 暫停文件上傳
  const pauseFileUpload = useCallback((fileId: number | null, fileName: string) => {
    updateFileStatus(fileId, fileName, ProgressStatus.PAUSED);
  }, []);

  // Info: (20241204 - tzuhan) 刪除文件
  const deleteFile = useCallback((fileId: number | null, fileName: string) => {
    setFiles((prev) =>
      prev.filter((f) => (f.id && fileId && f.id !== fileId) || f.name !== fileName)
    );
  }, []);

  const handleAddVoucher = useCallback(() => {
    router.push({
      pathname: ISUNFA_ROUTE.ADD_NEW_VOUCHER,
    });
  }, [selectedCertificates]);

  const [addOperations, setAddOperations] = useState<ISelectionToolBarOperation[]>([
    {
      operation: CERTIFICATE_USER_INTERACT_OPERATION.ADD_VOUCHER,
      buttonStr: 'certificate:SELECTION.ADD_NEW_VOUCHER',
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

  const [exportModalData, setExportModalData] = useState<ICertificate[]>([]);

  const handleExportModalApiResponse = useCallback(
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
      setExportModalData(resData.data.certificates);
    },
    []
  );

  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const handleExport = useCallback(() => {
    setIsExportModalOpen(true);
  }, []);

  const onExport = useCallback(() => {
    if (exportModalData.length > 0) {
      exportModalData.forEach((item) => {
        handleDownloadItem(item.id);
      });
    }
  }, [exportModalData]);

  const [exportOperations] = useState<ISelectionToolBarOperation[]>([
    {
      operation: CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD,
      buttonStr: 'certificate:EXPORT.TITLE',
      onClick: handleExport,
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
        currency: CurrencyType;
        certificates: ICertificate[];
      }>
    ) => {
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

  // Info: (20240920 - tzuhan) 全選操作
  const handleSelectAll = useCallback(() => {
    const ids = Object.values(certificates)
      .filter((certificate) => {
        return activeTab === InvoiceTabs.WITHOUT_VOUCHER
          ? !certificate.voucherNo
          : certificate.voucherNo;
      })
      .map((certificate) => certificate.id);
    handleSelect(ids, !isSelectedAll);
  }, [certificates, activeTab, isSelectedAll]);

  const deleteSelectedCertificates = useCallback(
    async (selectedIds: number[]) => {
      try {
        const { success, data: deletedIds } = await deleteCertificatesAPI({
          params: { companyId },
          body: { certificateIds: selectedIds }, // Info: (20241128 - Murky) @tzuhan 這邊用multiple delete，然後把要delete的東西放在array裡
        });
        if (success && deletedIds) {
          let updatedData: { [id: string]: ICertificateUI } = {};
          setCertificates((prev) => {
            updatedData = { ...prev };
            deletedIds.forEach((id) => {
              delete updatedData[id];
            });
            return updatedData;
          });
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
    [certificates]
  );

  const handleDeleteItem = useCallback(
    (selectedId: number) => {
      messageModalDataHandler({
        title: t('certificate:DELETE.TITLE'),
        content: t('certificate:DELETE.CONTENT'),
        notes: `${certificates[selectedId].name}?`,
        messageType: MessageType.WARNING,
        submitBtnStr: t('certificate:DELETE.YES'),
        submitBtnFunction: async () => {
          await deleteSelectedCertificates([selectedId]);
        },
        backBtnStr: t('certificate:DELETE.NO'),
      });
      messageModalVisibilityHandler();
    },
    [certificates]
  );

  const handleDeleteSelectedItems = useCallback(() => {
    setActiveSelection(false);
    // Info: (20241025 - tzuhan) 找出所有選中的項目 ID
    const selectedIds = Object.values(certificates)
      .filter((certificate) => {
        return (
          (activeTab === InvoiceTabs.WITHOUT_VOUCHER
            ? !certificate.voucherNo
            : certificate.voucherNo) && certificate.isSelected
        );
      })
      .map((certificate) => certificate.id);

    // Info: (20241025 - tzuhan) 如果有選中的項目，顯示刪除確認模態框
    if (selectedIds.length > 0) {
      messageModalDataHandler({
        title: t('certificate:DELETE.TITLE'),
        content: t('certificate:DELETE.CONTENT_DELETE_MORE', { count: selectedIds.length }),
        messageType: MessageType.WARNING,
        submitBtnStr: t('certificate:DELETE.YES'),
        submitBtnFunction: async () => {
          // Info: (20241025 - tzuhan) 批量刪除選中的項目
          // Deprecated: (20240923 - tzuhan) debugging purpose
          // eslint-disable-next-line no-console
          console.log('Remove multiple ids:', selectedIds);
          await deleteSelectedCertificates(selectedIds);
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
            buttonStr: 'certificate:SELECTION.ADD_NEW_VOUCHER',
            onClick: handleAddVoucher,
          },
        ]);
      } else {
        setAddOperations([]);
      }
      setActiveTab(tab as InvoiceTabs);
      setActiveSelection(false);
    },
    [activeTab, handleAddVoucher, handleExport]
  );

  const openEditModalHandler = useCallback(
    (id: number) => {
      setIsEditModalOpen(true);
      setEditingId(id);
    },
    [editingId]
  );

  const onUpdateFilename = useCallback(
    (id: number, filename: string) => {
      let updatedData: { [id: string]: ICertificateUI } = {};
      setCertificates((prev) => {
        updatedData = {
          ...prev,
          [id]: {
            ...prev[id],
            file: {
              ...prev[id].file,
              name: filename,
            },
            name: filename,
          },
        } as { [id: string]: ICertificateUI };
        // Deprecate: (20241218 - tzuhan) Debugging purpose
        // eslint-disable-next-line no-console
        console.log('updatedData[id]', updatedData[id]);
        return updatedData;
      });
    },
    [certificates]
  );

  const handleEditItem = useCallback(
    async (certificate: ICertificate) => {
      try {
        const { invoice } = certificate;

        const postOrPutAPI = invoice.id
          ? updateInvoiceAPI({
              params: { companyId, certificateId: certificate.id, invoiceId: invoice.id },
              body: invoice,
            })
          : createInvoiceAPI({
              params: { companyId, certificateId: certificate.id },
              body: invoice,
            });

        const { success, data: updatedCertificate } = await postOrPutAPI;

        if (success && updatedCertificate) {
          // Deprecate: (20241218 - tzuhan) Debugging purpose
          // eslint-disable-next-line no-console
          console.log('updatedCertificate', updatedCertificate);
          let updatedData: { [id: string]: ICertificateUI } = {};
          setCertificates((prevCertificates) => {
            updatedData = {
              ...prevCertificates,
              [certificate.id]: {
                ...updatedCertificate,
                isSelected: false,
                actions: [
                  CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD,
                  CERTIFICATE_USER_INTERACT_OPERATION.REMOVE,
                ],
              },
            } as { [id: string]: ICertificateUI };
            // Deprecate: (20241218 - tzuhan) Debugging purpose
            // eslint-disable-next-line no-console
            console.log(
              `updatedData[certificate.id:${certificate.id}]`,
              updatedData[certificate.id]
            );
            return updatedData;
          });
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

  const handleNewCertificateComing = useCallback(
    async (newCertificate: ICertificate) => {
      let newCertificatesUI: { [id: string]: ICertificateUI } = {};
      setCertificates((prev) => {
        newCertificatesUI = {
          [newCertificate.id]: {
            ...newCertificate,
            isSelected: false,
            actions: !newCertificate.voucherNo
              ? [
                  CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD,
                  CERTIFICATE_USER_INTERACT_OPERATION.REMOVE,
                ]
              : [CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD],
          },
        };
        Object.values(prev).forEach((certificate) => {
          newCertificatesUI[certificate.id] = {
            ...certificate,
          };
        });
        return newCertificatesUI;
      });
    },
    [certificates]
  );

  const parseCertificateCreateEventMessage = useCallback(
    (data: { message: string }) => {
      const newCertificate: ICertificate = JSON.parse(data.message);
      handleNewCertificateComing(newCertificate);
      setUnRead((prev) => ({
        ...prev,
        withoutVoucher: prev.withoutVoucher + 1,
      }));
    },
    [companyId, certificates, activeTab]
  );

  useEffect(() => {
    if (dateSort) {
      setSelectedSort({ by: SortBy.DATE, order: dateSort });
    } else if (amountSort) {
      setSelectedSort({ by: SortBy.AMOUNT, order: amountSort });
    } else if (voucherSort) {
      setSelectedSort({ by: SortBy.VOUCHER_NUMBER, order: voucherSort });
    } else {
      setSelectedSort(undefined);
    }
  }, [amountSort, voucherSort, dateSort]);

  useEffect(() => {
    const pusher = getPusherInstance(userAuth?.id);
    const channel = pusher.subscribe(`${PRIVATE_CHANNEL.CERTIFICATE}-${companyId}`);
    channel.bind(CERTIFICATE_EVENT.CREATE, parseCertificateCreateEventMessage);

    return () => {
      if (channel) {
        channel.unbind(CERTIFICATE_EVENT.CREATE, parseCertificateCreateEventMessage);
        channel.unsubscribe();
      }
      pusher.unsubscribe(`${PRIVATE_CHANNEL.CERTIFICATE}-${companyId}`);
    };
  }, []);

  const filterCertificates = Object.values(certificates).filter((certificate) => {
    return activeTab === InvoiceTabs.WITHOUT_VOUCHER
      ? !certificate.voucherNo
      : certificate.voucherNo;
  });

  return !companyId ? (
    <div className="flex flex-col items-center gap-2">
      <Image
        src="/elements/uploading.gif"
        className="rounded-xs"
        width={150}
        height={150}
        alt={t('certificate:UPLOAD.LOADING')}
      />
      <div>{t('certificate:UPLOAD.LOADING')}</div>
    </div>
  ) : (
    <>
      {isExportModalOpen && (
        <CertificateExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          handleApiResponse={handleExportModalApiResponse}
          handleExport={onExport}
          certificates={exportModalData}
        />
      )}
      {isEditModalOpen && (
        <CertificateEditModal
          companyId={companyId}
          isOpen={isEditModalOpen}
          toggleModel={() => setIsEditModalOpen((prev) => !prev)}
          currencyAlias={currency}
          certificate={editingId ? certificates[editingId] : undefined}
          onUpdateFilename={onUpdateFilename}
          onSave={handleEditItem}
          onDelete={handleDeleteItem}
        />
      )}
      {/* Info: (20240919 - tzuhan) Main Content */}
      <div
        // Info: (20241210 - tzuhan) 隱藏 scrollbar
        className={`flex grow flex-col gap-4 ${filterCertificates && filterCertificates.length > 0 ? 'hide-scrollbar overflow-scroll' : ''} `}
      >
        {/* Info: (20240919 - tzuhan) Upload Area */}
        <CertificateFileUpload isDisabled={false} setFiles={setFiles} />
        <FloatingUploadPopup
          files={files}
          pauseFileUpload={pauseFileUpload}
          deleteFile={deleteFile}
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
          currency: CurrencyType;
          certificates: ICertificate[];
        }>
          className="mt-2"
          params={{ companyId }}
          apiName={APIName.CERTIFICATE_LIST_V2}
          onApiResponse={handleApiResponse}
          page={page}
          pageSize={DEFAULT_PAGE_LIMIT}
          tab={activeTab}
          types={Object.values(InvoiceType)}
          viewType={viewType}
          viewToggleHandler={setViewType}
          /* Deprecated: (20250107 - tzuhan) 一次只能有一個排序條件
          dateSort={dateSort}
          otherSorts={otherSorts}
          */
          sort={selectedSort}
        />

        {/* Info: (20240919 - tzuhan) Certificate Table */}
        {filterCertificates && filterCertificates.length > 0 ? (
          <>
            <SelectionToolbar
              className="mt-6"
              active={activeSelection}
              isSelectable={activeTab === InvoiceTabs.WITHOUT_VOUCHER}
              onActiveChange={setActiveSelection}
              items={filterCertificates}
              subtitle={`${t('certificate:LIST.INVOICE_TOTAL_PRICE')}:`}
              totalPrice={totalInvoicePrice}
              currency={currency}
              selectedCount={Object.values(selectedCertificates).length}
              totalCount={filterCertificates.length || 0}
              handleSelect={handleSelect}
              handleSelectAll={handleSelectAll}
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
              certificates={filterCertificates}
              currencyAlias={currency}
              viewType={viewType}
              activeSelection={activeSelection}
              handleSelect={handleSelect}
              handleSelectAll={handleSelectAll}
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
            <Image src="/images/empty.svg" alt="empty" width={120} height={135} />
          </div>
        )}
      </div>
    </>
  );
};

export default CertificateListBody;
