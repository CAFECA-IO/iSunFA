import React, { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { useModalContext } from '@/contexts/modal_context';
import { CERTIFICATE_USER_INTERACT_OPERATION, InvoiceTabs } from '@/constants/invoice_rc2';
import { DISPLAY_LIST_VIEW_TYPE } from '@/constants/display';
import APIHandler from '@/lib/utils/api_handler';
import { ICertificate, ICertificateUI } from '@/interfaces/certificate';
import { MessageType } from '@/interfaces/message_modal';
import { ToastType } from '@/interfaces/toastify';
import { IPaginatedData } from '@/interfaces/pagination';
import { DEFAULT_PAGE_LIMIT, FREE_ACCOUNT_BOOK_ID } from '@/constants/config';
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
import { ISortOption } from '@/interfaces/sort';
import { EmptyObject } from '@/interfaces/common';

const CertificateListBody: React.FC<EmptyObject> = () => {
  const { t } = useTranslation(['certificate']);
  const router = useRouter();
  const { userAuth, connectedAccountBook } = useUserCtx();
  const accountBookId = connectedAccountBook?.id || FREE_ACCOUNT_BOOK_ID;
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();
  const { trigger: updateInvoiceAPI } = APIHandler<ICertificate>(APIName.INVOICE_PUT_V2);
  const { trigger: createInvoiceAPI } = APIHandler<ICertificate>(APIName.INVOICE_POST_V2);
  const { trigger: deleteCertificatesAPI } = APIHandler<number[]>(
    APIName.CERTIFICATE_DELETE_MULTIPLE_V2
  ); // Info: (20241128 - Murky) @tzuhan 這邊會回傳成功被刪掉的certificate

  const [activeTab, setActiveTab] = useState<InvoiceTabs>(InvoiceTabs.WITHOUT_VOUCHER);
  // const [certificates, setCertificates] = useState<{ [id: string]: ICertificateUI }>({});
  const [certificates, setCertificates] = useState<ICertificateUI[]>([]);
  const [selectedCertificates, setSelectedCertificates] = useState<ICertificateUI[]>([]);

  const [totalInvoicePrice, setTotalInvoicePrice] = useState<number>(0);
  const [incomplete, setIncomplete] = useState<{
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
  const [selectedSort, setSelectedSort] = useState<ISortOption | undefined>();
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
      const downloadItem = certificates.find((certificate) => certificate.id === id);
      if (!downloadItem) return;
      const { file } = downloadItem;
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

  const handleExportModalApiResponse = useCallback((resData: IPaginatedData<ICertificate[]>) => {
    setExportModalData(resData.data);
  }, []);

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

  const handleApiResponse = useCallback(
    (resData: IPaginatedData<ICertificate[]>) => {
      try {
        const note = JSON.parse(resData.note || '{}') as {
          totalInvoicePrice: number;
          incomplete: {
            withVoucher: number;
            withoutVoucher: number;
          };
          currency: string;
        };
        setTotalInvoicePrice(note.totalInvoicePrice);
        setIncomplete(note.incomplete);
        setTotalPages(resData.totalPages);
        setTotalCount(resData.totalCount);
        setPage(resData.page);
        setCurrency(note.currency as CurrencyType);

        const certificateData = resData.data.map((item) => ({
          ...item,
          isSelected: false,
          actions:
            activeTab === InvoiceTabs.WITHOUT_VOUCHER
              ? [
                  CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD,
                  CERTIFICATE_USER_INTERACT_OPERATION.REMOVE,
                ]
              : [CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD],
        }));

        setCertificates(certificateData);
      } catch (error) {
        (error as Error).message += ' (from API response)';
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
      const updatedData = certificates.map((certificate) => {
        return ids.includes(certificate.id) ? { ...certificate, isSelected } : certificate;
      });

      const selectedData = isSelected
        ? Array.from(
            new Set([...selectedCertificates, ...certificates.filter((c) => ids.includes(c.id))])
          )
        : selectedCertificates.filter((c) => !ids.includes(c.id));

      localStorage.setItem('selectedCertificates', JSON.stringify(selectedData));
      setCertificates(updatedData);
      setSelectedCertificates(selectedData);
      setIsSelectedAll(updatedData.every((cert) => cert.isSelected));
    },
    [certificates, selectedCertificates]
  );

  // Info: (20240920 - tzuhan) 全選操作
  const handleSelectAll = useCallback(() => {
    const ids = certificates
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
          params: { accountBookId },
          body: { certificateIds: selectedIds },
        });

        if (success && deletedIds) {
          setCertificates((prev) => prev.filter((cert) => !deletedIds.includes(cert.id)));
          setSelectedCertificates((prev) => prev.filter((cert) => !deletedIds.includes(cert.id)));

          toastHandler({
            id: ToastId.DELETE_CERTIFICATE_SUCCESS,
            type: ToastType.SUCCESS,
            content: t('certificate:DELETE.SUCCESS'),
            closeable: true,
          });
        } else throw new Error(t('certificate:DELETE.ERROR'));
      } catch (error) {
        (error as Error).message += ' (from deleteSelectedCertificates)';
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
        notes: `${certificates.find((certificate) => certificate.id === selectedId)?.name || ''}?`,
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

    const selectedIds = selectedCertificates.map((c) => c.id);

    if (selectedIds.length > 0) {
      messageModalDataHandler({
        title: t('certificate:DELETE.TITLE'),
        content: t('certificate:DELETE.CONTENT_DELETE_MORE', { count: selectedIds.length }),
        messageType: MessageType.WARNING,
        submitBtnStr: t('certificate:DELETE.YES'),
        submitBtnFunction: async () => {
          await deleteSelectedCertificates(selectedIds);
        },
        backBtnStr: t('certificate:DELETE.NO'),
      });

      messageModalVisibilityHandler();
    }
  }, [selectedCertificates]);

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
      setCertificates((prev) =>
        prev.map((cert) => {
          return cert.id === id
            ? {
                ...cert,
                file: { ...cert.file, name: filename },
                name: filename,
              }
            : cert;
        })
      );
    },
    [certificates]
  );

  const handleEditItem = useCallback(
    async (certificate: ICertificate) => {
      try {
        const { invoice } = certificate;

        const postOrPutAPI = invoice.id
          ? updateInvoiceAPI({
              params: {
                accountBookId,
                certificateId: certificate.id,
                invoiceId: invoice.id,
              },
              body: invoice,
            })
          : createInvoiceAPI({
              params: { accountBookId, certificateId: certificate.id },
              body: invoice,
            });

        const { success, data: updatedCertificate } = await postOrPutAPI;

        if (success && updatedCertificate) {
          let updatedData: ICertificateUI[] = [];
          setCertificates((prev) => {
            updatedData = [...prev];
            const index = updatedData.findIndex((d) => d.id === updatedCertificate.id);
            updatedData[index] = {
              ...updatedCertificate,
              isSelected: false,
              actions: [
                CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD,
                CERTIFICATE_USER_INTERACT_OPERATION.REMOVE,
              ],
            };
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
    [certificates, accountBookId]
  );

  const handleNewCertificateComing = useCallback(async (newCertificate: ICertificate) => {
    setCertificates((prev) => [
      {
        ...newCertificate,
        isSelected: false,
        actions: !newCertificate.voucherNo
          ? [
              CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD,
              CERTIFICATE_USER_INTERACT_OPERATION.REMOVE,
            ]
          : [CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD],
      },
      ...prev,
    ]);
  }, []);

  const parseCertificateCreateEventMessage = useCallback(
    (data: { message: string }) => {
      const newCertificate: ICertificate = JSON.parse(data.message);
      handleNewCertificateComing(newCertificate);
      setIncomplete((prev) => ({
        ...prev,
        withoutVoucher: prev.withoutVoucher + 1,
      }));
    },
    [handleNewCertificateComing]
  );

  useEffect(() => {
    if (dateSort) {
      setSelectedSort({ sortBy: SortBy.DATE, sortOrder: dateSort });
    } else if (amountSort) {
      setSelectedSort({ sortBy: SortBy.AMOUNT, sortOrder: amountSort });
    } else if (voucherSort) {
      setSelectedSort({ sortBy: SortBy.VOUCHER_NUMBER, sortOrder: voucherSort });
    } else {
      setSelectedSort(undefined);
    }
  }, [amountSort, voucherSort, dateSort]);

  useEffect(() => {
    const pusher = getPusherInstance(userAuth?.id);
    const channel = pusher.subscribe(`${PRIVATE_CHANNEL.CERTIFICATE}-${accountBookId}`);
    channel.bind(CERTIFICATE_EVENT.CREATE, parseCertificateCreateEventMessage);

    return () => {
      if (channel) {
        channel.unbind(CERTIFICATE_EVENT.CREATE, parseCertificateCreateEventMessage);
        channel.unsubscribe();
      }
      pusher.unsubscribe(`${PRIVATE_CHANNEL.CERTIFICATE}-${accountBookId}`);
    };
  }, []);

  return !accountBookId ? (
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
          accountBookId={accountBookId}
          isOpen={isEditModalOpen}
          toggleModel={() => setIsEditModalOpen((prev) => !prev)}
          currencyAlias={currency}
          certificate={
            editingId ? certificates.find((certificate) => certificate.id === editingId) : undefined
          }
          onUpdateFilename={onUpdateFilename}
          onSave={handleEditItem}
          onDelete={handleDeleteItem}
        />
      )}
      {/* Info: (20240919 - tzuhan) Main Content */}
      <div
        // Info: (20241210 - tzuhan) 隱藏 scrollbar
        className={`flex grow flex-col gap-4 ${Object.values(certificates) && Object.values(certificates).length > 0 ? 'hide-scrollbar overflow-scroll' : ''} `}
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
          counts={incomplete ? [incomplete.withoutVoucher, incomplete.withVoucher] : [0, 0]}
        />

        {/* Info: (20240919 - tzuhan) Filter Section */}
        <FilterSection<ICertificate[]>
          className="mt-2"
          params={{ accountBookId }}
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
        {Object.values(certificates) && Object.values(certificates).length > 0 ? (
          <>
            <SelectionToolbar
              className="mt-6"
              active={activeSelection}
              isSelectable={activeTab === InvoiceTabs.WITHOUT_VOUCHER}
              onActiveChange={setActiveSelection}
              items={Object.values(certificates)}
              subtitle={`${t('certificate:LIST.INVOICE_TOTAL_PRICE')}:`}
              totalPrice={totalInvoicePrice}
              currency={currency}
              selectedCount={Object.values(selectedCertificates).length}
              totalCount={Object.values(certificates).length || 0}
              handleSelect={handleSelect}
              handleSelectAll={handleSelectAll}
              addOperations={addOperations}
              onDelete={handleDeleteSelectedItems}
            />
            <Certificate
              activeTab={activeTab}
              page={page}
              setPage={setPage}
              totalPages={totalPages}
              totalCount={totalCount}
              certificates={Object.values(certificates)}
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
