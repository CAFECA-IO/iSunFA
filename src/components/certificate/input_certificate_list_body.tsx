import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { useModalContext } from '@/contexts/modal_context';
import {
  CERTIFICATE_USER_INTERACT_OPERATION,
  CertificateDirection,
  InvoiceTabs,
} from '@/constants/certificate';
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
} from '@/components/certificate/certificate_selection_tool_bar_new';
import InputCertificate from '@/components/certificate/input_certificate';
import InputCertificateEditModal from '@/components/certificate/input_certificate_edit_modal';
// Info: (20250507 - Anna)
// import { InvoiceType } from '@/constants/invoice';
import { ISUNFA_ROUTE } from '@/constants/url';
import CertificateFileUpload from '@/components/certificate/certificate_file_upload';
import { getPusherInstance } from '@/lib/utils/pusher_client';
import { CERTIFICATE_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';
import { CurrencyType } from '@/constants/currency';
import FloatingUploadPopup from '@/components/floating_upload_popup/floating_upload_popup';
import { ProgressStatus } from '@/constants/account';
import { IFileUIBeta } from '@/interfaces/file';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface CertificateListBodyProps {}

const InputCertificateListBody: React.FC<CertificateListBodyProps> = () => {
  const { t } = useTranslation(['certificate']);
  const downloadRef = useRef<HTMLDivElement>(null); // Info: (20250418 - Anna) 引用下載範圍

  const router = useRouter();
  const { userAuth, connectedAccountBook } = useUserCtx();
  const accountBookId = connectedAccountBook?.id || FREE_ACCOUNT_BOOK_ID;
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();
  const { trigger: updateInvoiceAPI } = APIHandler<ICertificate>(APIName.INVOICE_PUT_V2);
  const { trigger: createInvoiceAPI } = APIHandler<ICertificate>(APIName.INVOICE_POST_V2);
  const { trigger: deleteCertificatesAPI } = APIHandler<number[]>(
    APIName.CERTIFICATE_DELETE_MULTIPLE_V2
  ); // Info: (20241128 - Murky) @Anna 這邊會回傳成功被刪掉的certificate

  const [activeTab, setActiveTab] = useState<InvoiceTabs>(InvoiceTabs.WITHOUT_VOUCHER);
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
  const [viewType] = useState<DISPLAY_LIST_VIEW_TYPE>(DISPLAY_LIST_VIEW_TYPE.LIST);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSelectedAll, setIsSelectedAll] = useState<boolean>(false);
  const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  const [amountSort, setAmountSort] = useState<null | SortOrder>(null);
  const [voucherSort, setVoucherSort] = useState<null | SortOrder>(null);
  const [invoiceTypeSort, setInvoiceTypeSort] = useState<null | SortOrder>(null);
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
  // Info: (20250507 - Anna)
  // const [currency, setCurrency] = useState<CurrencyType>(CurrencyType.TWD);
  const currency = CurrencyType.TWD;
  const [files, setFiles] = useState<IFileUIBeta[]>([]);

  // Info: (20250415 - Anna) 用 useMemo 依賴 editingId 和 certificates，當 setEditingId(...)，React 重新算出新的 certificate 並傳給 modal
  const currentEditingCertificate = useMemo(() => {
    return editingId ? certificates.find((certificate) => certificate.id === editingId) : undefined;
  }, [editingId, certificates]);

  // Info: (20241204 - Anna) 通用文件狀態更新函數
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

  // Info: (20241204 - Anna) 暫停文件上傳
  const pauseFileUpload = useCallback((fileId: number | null, fileName: string) => {
    updateFileStatus(fileId, fileName, ProgressStatus.PAUSED);
  }, []);

  // Info: (20241204 - Anna) 刪除文件
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

  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleExport = useCallback(() => {
    setIsExporting(true);
  }, []);

  // Info: (20250506 - Anna) 等待畫面更新完成，避免截到尚未變更的畫面
  const waitForNextFrame = () => {
    return new Promise((resolve) => {
      requestAnimationFrame(() => resolve(true));
    });
  };

  // Info: (20250418 - Anna) 匯出憑證表格
  const handleDownload = async () => {
    setIsExporting(true);

    // Info: (20250506 - Anna) 等待畫面進入「isExporting=true」的狀態
    await waitForNextFrame();

    if (!downloadRef.current) return;

    // Info: (20250506 - Anna) 移除下載區塊內所有 h-54px 限制（例如日曆格子）
    downloadRef.current.querySelectorAll('.h-54px').forEach((el) => {
      el.classList.remove('h-54px');
    });

    // Info: (20250401 - Anna) 插入修正樣式
    const style = document.createElement('style');
    style.innerHTML = `
    .download-pb-4 {
    padding-bottom: 16px;
  }
    .download-pb-3 {
    padding-bottom: 12px;
  }
    .download-hidden {
    display: none;
  }
`;

    document.head.appendChild(style);

    const canvas = await html2canvas(downloadRef.current, {
      scale: 2, // Info: (20250418 - Anna) 增加解析度
      useCORS: true, // Info: (20250418 - Anna) 若有使用圖片，允許跨域圖片
    });

    const imgData = canvas.toDataURL('image/png');

    // Info: (20250327 - Anna) jsPDF 是類別，但命名為小寫，需關閉 eslint new-cap
    // eslint-disable-next-line new-cap
    const pdf = new jsPDF('p', 'mm', 'a4');

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    style.remove();
    pdf.save('input-certificates.pdf');

    // Info: (20250506 - Anna) 匯出後還原畫面
    setIsExporting(false);
  };

  const [exportOperations] = useState<ISelectionToolBarOperation[]>([
    {
      operation: CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD,
      buttonStr: 'certificate:EXPORT.TITLE',
      onClick: handleExport,
    },
  ]);

  // Info: (20250507 - Anna)
  // const handleApiResponse = useCallback(
  //   // Info: (20250507 - Anna) Debug
  //   (resData: IPaginatedData<ICertificate[]>) => {
  //     // eslint-disable-next-line no-console
  //     console.log('📦 CERTIFICATE_LIST_V2 response:', resData);
  //     try {
  //       const note = JSON.parse(resData.note || '{}') as {
  //         totalInvoicePrice: number;
  //         incomplete: {
  //           withVoucher: number;
  //           withoutVoucher: number;
  //         };
  //         currency: string;
  //       };
  //       setTotalInvoicePrice(note.totalInvoicePrice);
  //       setIncomplete(note.incomplete);
  //       setTotalPages(resData.totalPages);
  //       setTotalCount(resData.totalCount);
  //       setPage(resData.page);
  //       setCurrency(note.currency as CurrencyType);

  //       const certificateData = resData.data.map((item) => ({
  //         ...item,
  //         isSelected: false,
  //         actions:
  //           activeTab === InvoiceTabs.WITHOUT_VOUCHER
  //             ? [
  //                 CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD,
  //                 CERTIFICATE_USER_INTERACT_OPERATION.REMOVE,
  //               ]
  //             : [CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD],
  //       }));

  //       setCertificates(certificateData);
  //     } catch (error) {
  //       toastHandler({
  //         id: ToastId.LIST_CERTIFICATE_ERROR,
  //         type: ToastType.ERROR,
  //         content: t('certificate:ERROR.WENT_WRONG'),
  //         closeable: true,
  //       });
  //     }
  //   },
  //   [activeTab]
  // );

  const handleApiResponse = useCallback(
    (resData: IPaginatedData<ICertificate[]>) => {
      if (!resData || !Array.isArray(resData.data)) {
        // eslint-disable-next-line no-console
        console.error('🚨 resData 或 resData.data 無效：', resData);
        return;
      }

      // eslint-disable-next-line no-console
      console.log('📦 RC2 response:', resData);

      // 這裡的 note 不再需要解析，移除
      setTotalInvoicePrice(0); // RC2 沒有 totalInvoicePrice，設為 0 或自定邏輯
      setIncomplete({ withVoucher: 0, withoutVoucher: 0 }); // 同上
      setTotalPages(resData.totalPages);
      setTotalCount(resData.totalCount);
      setPage(resData.page);

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

  // Info: (20240920 - Anna) 全選操作
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

  // Todo: (20250415 - Anna) 憑證號碼和類型的排序，後端實作好後，要再來改這裡
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
      {isEditModalOpen && editingId !== null && (
        <InputCertificateEditModal
          accountBookId={accountBookId}
          isOpen={isEditModalOpen}
          toggleModel={() => setIsEditModalOpen((prev) => !prev)}
          currencyAlias={currency}
          certificate={currentEditingCertificate}
          onUpdateFilename={onUpdateFilename}
          onSave={handleEditItem}
          onDelete={handleDeleteItem}
          certificates={certificates} // Info: (20250415 - Anna) 傳入目前這頁的所有憑證清單（為了做前後筆切換）
          editingId={editingId} // Info: (20250415 - Anna) 傳入正在編輯的這筆 ID
          setEditingId={setEditingId} // Info: (20250415 - Anna) 前後筆切換時用
        />
      )}
      {/* Info: (20240919 - Anna) Main Content */}
      <div
        // Info: (20241210 - Anna) 隱藏 scrollbar
        className={`flex grow flex-col gap-4 ${Object.values(certificates) && Object.values(certificates).length > 0 ? 'hide-scrollbar overflow-scroll' : ''} `}
      >
        {/* Info: (20240919 - Anna) Upload Area */}
        <CertificateFileUpload
          isDisabled={false}
          setFiles={setFiles}
          certificateDirection={CertificateDirection.INPUT}
        />
        <FloatingUploadPopup
          files={files}
          pauseFileUpload={pauseFileUpload}
          deleteFile={deleteFile}
        />
        {/* Info: (20240919 - Anna) Tabs */}
        <Tabs
          tabs={Object.values(InvoiceTabs)}
          tabsString={[t('certificate:TAB.WITHOUT_VOUCHER'), t('certificate:TAB.WITH_VOUCHER')]}
          activeTab={activeTab}
          onTabClick={onTabClick}
          counts={incomplete ? [incomplete.withoutVoucher, incomplete.withVoucher] : [0, 0]}
        />

        {/* Info: (20240919 - Anna) Filter Section */}
        <FilterSection<ICertificate[]>
          className="mt-2"
          // Info: (20250507 - Anna)
          // params={{
          //   accountBookId,
          // }}
          params={{
            accountBookId,
            ...(selectedSort && {
              sortBy: selectedSort.by,
              sortOrder: selectedSort.order,
            }),
          }}
          // Info: (20250507 - Anna)
          // apiName={APIName.CERTIFICATE_LIST_V2}
          apiName={APIName.LIST_CERTIFICATE_RC2_INPUT}
          onApiResponse={handleApiResponse}
          page={page}
          pageSize={DEFAULT_PAGE_LIMIT}
          // Info: (20250507 - Anna)
          // tab={activeTab}
          // Info: (20250507 - Anna)
          // types={[
          //   InvoiceType.ALL,
          //   InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC,
          //   InvoiceType.PURCHASE_DUPLICATE_CASH_REGISTER_AND_OTHER,
          //   InvoiceType.PURCHASE_RETURNS_TRIPLICATE_AND_ELECTRONIC,
          //   InvoiceType.PURCHASE_RETURNS_DUPLICATE_CASH_REGISTER_AND_OTHER,
          //   InvoiceType.PURCHASE_UTILITY_ELECTRONIC_INVOICE,
          //   InvoiceType.PURCHASE_SUMMARIZED_TRIPLICATE_AND_ELECTRONIC,
          //   InvoiceType.PURCHASE_SUMMARIZED_DUPLICATE_CASH_REGISTER_AND_OTHER,
          //   InvoiceType.PURCHASE_CUSTOMS_DUTY_PAYMENT,
          //   InvoiceType.PURCHASE_CUSTOMS_DUTY_REFUND,
          // ]}
          // types={['INPUT_21', 'INPUT_22']} // 先暫時用字串
          labelClassName="text-neutral-300"
        />

        {/* Info: (20240919 - Anna) Certificate Table */}
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
              exportOperations={exportOperations}
              onDelete={handleDeleteSelectedItems}
              onDownload={handleDownload}
            />
            <div ref={downloadRef} className="download-page">
              <InputCertificate
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
                invoiceTypeSort={invoiceTypeSort}
                setDateSort={setDateSort}
                setAmountSort={setAmountSort}
                setVoucherSort={setVoucherSort}
                setInvoiceTypeSort={setInvoiceTypeSort}
                isExporting={isExporting}
              />
            </div>
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

export default InputCertificateListBody;
