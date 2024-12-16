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

interface CertificateListBodyProps {}

const CertificateListBody: React.FC<CertificateListBodyProps> = () => {
  const { t } = useTranslation(['certificate']);
  const router = useRouter();
  const { userAuth, selectedCompany } = useUserCtx();
  const companyId = selectedCompany?.id || FREE_COMPANY_ID;
  const params = { companyId: selectedCompany?.id };
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();
  const { trigger: updateCertificateAPI } = APIHandler<ICertificate>(APIName.INVOICE_PUT_V2);
  const { trigger: createCertificateAPI } = APIHandler<ICertificate>(APIName.INVOICE_POST_V2);
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
  const [otherSorts, setOtherSorts] = useState<{ sort: SortBy; sortOrder: SortOrder }[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [currency, setCurrency] = useState<CurrencyType>(CurrencyType.TWD);

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

  const deleteSelectedCertificates = useCallback(
    async (selectedIds: number[]) => {
      try {
        const { success, data: deletedIds } = await deleteCertificatesAPI({
          params: { companyId },
          body: { certificateIds: selectedIds }, // Info: (20241128 - Murky) @tzuhan 這邊用multiple delete，然後把要delete的東西放在array裡
        });
        if (success && deletedIds) {
          setCertificates((prev) => {
            const updatedData = { ...prev };
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
    // Info: (20241025 - tzuhan) 找出所有選中的項目 ID
    const selectedIds = Object.values(certificates)
      .filter((certificate) => certificate.isSelected)
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
      setCertificates((prev) => {
        const updatedData = {
          ...prev,
          [id]: {
            ...prev[id],
            file: {
              ...prev[id].file,
              name: filename,
            },
          },
        };
        return updatedData;
      });
    },
    [certificates]
  );

  const handleEditItem = useCallback(
    async (certificate: ICertificate) => {
      try {
        const postOrPutAPI = certificate.invoice.id
          ? updateCertificateAPI({
              params: { companyId, invoiceId: certificate.invoice.id },
              body: certificate.invoice,
            })
          : createCertificateAPI({
              params: { companyId },
              body: {
                certificateId: certificate.id,
                counterPartyId: certificate.invoice.counterParty?.id,
                inputOrOutput: certificate.invoice.inputOrOutput,
                date: certificate.invoice.date,
                no: certificate.invoice.no,
                currencyAlias: certificate.invoice.currencyAlias || currency,
                priceBeforeTax: certificate.invoice.priceBeforeTax,
                taxType: certificate.invoice.taxType,
                taxRatio: certificate.invoice.taxRatio,
                taxPrice: certificate.invoice.taxPrice,
                totalPrice: certificate.invoice.totalPrice,
                type: certificate.invoice.type,
                deductible: certificate.invoice.deductible,
              },
            });
        const { success, data: updatedCertificate } = await postOrPutAPI;
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

  const handleNewCertificateComing = useCallback(
    async (newCertificate: ICertificate) => {
      setCertificates((prev) => {
        // Deprecated: (20241122 - tzuhan) Debugging purpose
        // eslint-disable-next-line no-console
        console.log(`CertificateListBody handleNewCertificateComing: prev`, prev);
        const newCertificatesUI: { [id: string]: ICertificateUI } = {
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
        // Deprecated: (20241122 - tzuhan) Debugging purpose
        // eslint-disable-next-line no-console
        console.log(
          `CertificateListBody handleNewCertificateComing: newCertificatesUI`,
          newCertificatesUI
        );
        return newCertificatesUI;
      });
    },
    [certificates]
  );

  const parseCertificateCreateEventMessage = useCallback(
    (data: { message: string }) => {
      const newCertificate: ICertificate = JSON.parse(data.message);
      // Deprecated: (20241122 - tzuhan) Debugging purpose
      // eslint-disable-next-line no-console
      console.log(`CertificateListBody handleNewCertificateComing: newCertificate`, newCertificate);
      handleNewCertificateComing(newCertificate);

      // Info: (20241206 - Murky) @tzuhan 我在這邊設定上傳成功之後會把unRead + 1
      const newUnread = {
        withVoucher: unRead.withVoucher,
        withoutVoucher: unRead.withoutVoucher + 1,
      };
      setUnRead(newUnread);
    },
    [companyId, certificates, activeTab]
  );

  useEffect(() => {
    setOtherSorts([
      ...(amountSort ? [{ sort: SortBy.AMOUNT, sortOrder: amountSort }] : []),
      ...(voucherSort ? [{ sort: SortBy.VOUCHER_NUMBER, sortOrder: voucherSort }] : []),
    ]);
  }, [amountSort, voucherSort]);

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

  return (
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
        // eslint-disable-next-line tailwindcss/no-custom-classname
        className={`flex grow flex-col gap-4 ${certificates && Object.values(certificates).length > 0 ? 'hide-scrollbar overflow-scroll' : ''} `}
      >
        {/* Info: (20240919 - tzuhan) Upload Area */}
        <CertificateFileUpload />
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
              subtitle={`${t('certificate:LIST.INVOICE_TOTAL_PRICE')}:`}
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
    </>
  );
};

export default CertificateListBody;
