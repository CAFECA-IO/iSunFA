import React, { useCallback, useState, useEffect } from 'react';
import useStateRef from 'react-usestateref';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import {
  ICertificate,
  ICertificateMeta,
  ICertificateUI,
  OPERATIONS,
  VIEW_TYPES,
} from '@/interfaces/certificate';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { getPusherInstance } from '@/lib/pusherClient';
import { CERTIFICATE_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';
import Tabs from '@/components/tabs/tabs';
import FilterSection from '@/components/filter_section/filter_section';
import SelectionToolbar from '@/components/selection_tool_bar/selection_tool_bar';
import Certificate from '@/components/certificate/certificate';
import CertificateEditModal from '@/components/certificate/certificate_edit_modal';
import FloatingUploadPopup from '@/components/floating_upload_popup/floating_upload_popup';
import CertificateQRCodeModal from '@/components/certificate/certificate_qrcode_modal';
import Image from 'next/image';
import { useModalContext } from '@/contexts/modal_context';
import { MessageType } from '@/interfaces/message_modal';
import { ToastId } from '@/constants/toast_id';
import { ToastType } from '@/interfaces/toastify';
import { IPaginatedData } from '@/interfaces/pagination';
import UploadAreaInvoice from '@/components/upload_area/upload_area_invoice';

interface CertificateListBodyProps {}

const CertificateListBody: React.FC<CertificateListBodyProps> = () => {
  const { t } = useTranslation('certificate');
  const { selectedCompany } = useUserCtx();
  const companyId = selectedCompany?.id;
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();
  const { trigger: encryptAPI } = APIHandler<string>(APIName.ENCRYPT);
  const [token, setToken, tokenRef] = useStateRef<string | undefined>(undefined);
  const [showQRCode, setShowQRCode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState<{ [id: string]: ICertificateUI }>({});
  const [totalInvoicePrice, setTotalInvoicePrice] = useState<number>(0);
  const [unRead, setUnRead] = useState<{
    withVoucher: number;
    withoutVoucher: number;
  }>({
    withVoucher: 0,
    withoutVoucher: 0,
  });
  const [activeSelection, setActiveSelection] = React.useState<boolean>(false);
  const [viewType, setViewType] = useState<VIEW_TYPES>(VIEW_TYPES.LIST);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSelectedAll, setIsSelectedAll] = useState<boolean>(false);
  // TODO: (20241016 - tzuhan) remove test data
  const [uploadingCertificates, setUploadingCertificates] = useState<{
    [id: number]: ICertificateMeta;
  }>({});

  const handleApiResponse = useCallback(
    (
      resData: IPaginatedData<{
        totalInvoicePrice: number;
        unRead: {
          withVoucher: number;
          withoutVoucher: number;
        };
        certificates: ICertificate[];
      }>
    ) => {
      setTotalInvoicePrice(resData.data.totalInvoicePrice);
      setUnRead(resData.data.unRead);
      const certificateData = resData.data.certificates.reduce(
        (acc, item) => {
          acc[item.id] = {
            ...item,
            isSelected: false,
            actions:
              activeTab === 0 ? [OPERATIONS.DOWNLOAD, OPERATIONS.REMOVE] : [OPERATIONS.DOWNLOAD],
          };
          return acc;
        },
        {} as { [id: number]: ICertificateUI }
      );
      setData(certificateData);
    },
    []
  );

  const handleSelect = useCallback(
    (ids: number[], isSelected: boolean) => {
      const updatedData = {
        ...data,
      };
      if (ids.length === Object.keys(updatedData).length) {
        setIsSelectedAll(isSelected);
      } else {
        setIsSelectedAll(false);
      }
      ids.forEach((id) => {
        updatedData[id] = {
          ...updatedData[id],
          isSelected,
        };
      });
      setData(updatedData);
    },
    [data, activeTab, isSelectedAll]
  );

  const filterSelectedIds = useCallback(() => {
    return Object.keys(data).filter((id) => data[parseInt(id, 10)].isSelected);
  }, [data, activeTab]);

  const handleAddVoucher = useCallback(() => {
    // Todo: (20240920 - tzuhan) Add voucher
    // Deprecated: (20240920 - tzuhan) debugging purpose
    // eslint-disable-next-line no-console
    console.log('Add voucher on selected ids:', filterSelectedIds());
  }, [filterSelectedIds]);

  const handleAddAsset = useCallback(() => {
    // Todo: (20240920 - tzuhan) Add asset
    // Deprecated: (20240920 - tzuhan) debugging purpose
    // eslint-disable-next-line no-console
    console.log('Add asset on selected ids:', filterSelectedIds());
  }, [filterSelectedIds]);

  const onRemove = useCallback((id: number) => {
    messageModalDataHandler({
      title: t('certificate:DELETE.TITLE'),
      content: t('certificate:DELETE.CONTENT'),
      notes: `${data[id].invoice.name}?`,
      messageType: MessageType.WARNING,
      submitBtnStr: t('certificate:DELETE.YES'),
      submitBtnFunction: () => {
        try {
          // Todo: (20240923 - tzuhan) Remove item
          // Deprecated: (20240923 - tzuhan) debugging purpose
          // eslint-disable-next-line no-console
          console.log('Remove single id:', id);
          toastHandler({
            id: ToastId.DELETE_CERTIFICATE_SUCCESS,
            type: ToastType.SUCCESS,
            content: t('certificate:DELETE.SUCCESS'),
            closeable: true,
          });
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
  }, []);

  const handleDelete = useCallback(() => {
    // Todo: (20240920 - tzuhan) Delete items
    Object.keys(data).forEach((id) => {
      if (data[id].isSelected) {
        // Deprecated: (20240920 - tzuhan) debugging purpose
        // eslint-disable-next-line no-console
        console.log('Delete selected id:', id);
      }
    });

    const selectedIds = filterSelectedIds();
    if (selectedIds.length > 0) {
      messageModalDataHandler({
        title: t('certificate:DELETE.TITLE'),
        content: t('certificate:DELETE.CONTENT_DELETE_MORE', { count: selectedIds.length }),
        messageType: MessageType.WARNING,
        submitBtnStr: t('certificate:DELETE.YES'),
        submitBtnFunction: () => {
          try {
            // Todo: (20240923 - tzuhan) Remove item
            // Deprecated: (20240923 - tzuhan) debugging purpose
            // eslint-disable-next-line no-console
            console.log('Remove multiple ids:', selectedIds);
            toastHandler({
              id: ToastId.DELETE_CERTIFICATE_SUCCESS,
              type: ToastType.SUCCESS,
              content: t('certificate:DELETE.SUCCESS'),
              closeable: true,
            });
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
    }
  }, [data, activeTab]);

  const onDownload = useCallback((id: number) => {
    // TODO: (20240923 - tzuhan) 下載單個項目
    // Deprecated: (20240923 - tzuhan) debugging purpose
    // eslint-disable-next-line no-console
    console.log('Download single id:', id);
  }, []);

  // Info: (20240923 - tzuhan) 下載選中項目
  const handleDownload = useCallback(() => {
    // TODO: (20240923 - tzuhan) 下載選中的項目
    Object.keys(data).forEach((id) => {
      if (data[parseInt(id, 10)].isSelected) {
        // Deprecated: (20240923 - tzuhan) debugging purpose
        // eslint-disable-next-line no-console
        console.log('Download selected id:', id);
      }
    });
  }, [data, activeTab]);

  const openEditModalHandler = useCallback(
    (id: number) => {
      setIsEditModalOpen(true);
      setEditingId(id);
    },
    [editingId]
  );

  const handleSave = useCallback((certificate: ICertificate) => {
    // Deprecated: (20240923 - tzuhan) debugging purpose
    // eslint-disable-next-line no-console
    console.log('Save selected id:', certificate);
  }, []);

  const certificateHandler = useCallback(
    async (message: { token: string; certificate: ICertificateMeta }) => {
      const { token: receivedToken, certificate: certificateData } = message;
      // Deprecated: (20241011 - tzuhan) Debugging purpose
      // eslint-disable-next-line no-console
      console.log(
        `pusher got message, (token(${tokenRef.current})===_token${receivedToken})?${tokenRef.current === receivedToken} message:`,
        message
      );

      if (receivedToken === tokenRef.current) {
        const updatedCertificates = {
          ...uploadingCertificates,
        };
        updatedCertificates[certificateData.id] = certificateData;
        setUploadingCertificates(updatedCertificates);
        // Deprecated: (20241011 - tzuhan) Debugging purpose
        // eslint-disable-next-line no-console
        console.log(`uploadingCertificates:`, uploadingCertificates);
      }
    },
    [tokenRef, setUploadingCertificates]
  );

  const certificateUpdateHandler = useCallback((message: { certificate: ICertificate }) => {
    const newCertificates = {
      ...data,
    };
    newCertificates[message.certificate.id] = {
      ...message.certificate,
      isSelected: false,
      actions: !message.certificate.voucherNo
        ? [OPERATIONS.DOWNLOAD, OPERATIONS.REMOVE]
        : [OPERATIONS.DOWNLOAD],
    };
    setData(newCertificates);
  }, []);

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
    getToken();
  }, [getToken]);

  useEffect(() => {
    const pusher = getPusherInstance();
    const channel = pusher.subscribe(PRIVATE_CHANNEL.CERTIFICATE);

    channel.bind(CERTIFICATE_EVENT.UPLOAD, certificateHandler);
    channel.bind(CERTIFICATE_EVENT.UPDATE, certificateUpdateHandler);

    return () => {
      channel.unbind(CERTIFICATE_EVENT.UPLOAD, certificateHandler);
      channel.unbind(CERTIFICATE_EVENT.UPDATE, certificateUpdateHandler);
      pusher.unsubscribe(PRIVATE_CHANNEL.CERTIFICATE);
    };
  }, []);

  return (
    <>
      {isEditModalOpen && (
        <CertificateEditModal
          isOpen={isEditModalOpen}
          toggleIsEditModalOpen={setIsEditModalOpen}
          certificate={editingId ? data[editingId] : undefined}
          onSave={handleSave}
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
        className={`flex grow flex-col gap-4 ${data && Object.values(data).length > 0 ? 'overflow-y-scroll' : ''} `}
      >
        {/* Info: (20240919 - tzuhan) Upload Area */}
        <UploadAreaInvoice isDisabled={false} withScanner toggleQRCode={toggleQRCode} />
        {/* Info: (20240919 - tzuhan) Tabs */}
        <Tabs
          tabs={[t('certificate:TAB.WITHOUT_VOUCHER'), t('certificate:TAB.WITH_VOUCHER')]}
          activeTab={activeTab}
          onTabClick={(index: number) => setActiveTab(index)}
          counts={[unRead.withoutVoucher, unRead.withVoucher]}
        />

        {/* Info: (20240919 - tzuhan) Filter Section */}
        <FilterSection
          className="mt-2"
          apiName={APIName.CERTIFICATE_LIST_V2}
          types={['All', 'Invoice', 'Receipt']}
          hasBeenUsed={activeTab === 1}
          onApiResponse={handleApiResponse}
          viewType={viewType}
          viewToggleHandler={setViewType}
        />

        {/* Info: (20240919 - tzuhan) Certificate Table */}
        {data && Object.values(data).length > 0 ? (
          <>
            <SelectionToolbar
              className="mt-6"
              active={activeSelection}
              isSelectable={activeTab === 0}
              onActiveChange={setActiveSelection}
              items={Object.values(data)}
              itemType="Certificates"
              subtitle={`${t('certificate:LIST.INVOICE_TOTAL_PRRICE')}:`}
              totalPrice={totalInvoicePrice}
              currency="TWD"
              selectedCount={filterSelectedIds().length}
              totalCount={Object.values(data).length || 0}
              handleSelect={handleSelect}
              operations={activeTab === 1 ? [] : ['ADD_VOUCHER', 'DELETE']}
              onAddVoucher={handleAddVoucher}
              onAddAsset={handleAddAsset}
              onDelete={handleDelete}
              onDownload={handleDownload}
            />
            <Certificate
              activeTab={activeTab}
              data={Object.values(data)}
              viewType={viewType}
              activeSelection={activeSelection}
              handleSelect={handleSelect}
              isSelectedAll={isSelectedAll}
              onDownload={onDownload}
              onRemove={onRemove}
              onEdit={openEditModalHandler}
            />
          </>
        ) : (
          <div className="flex flex-auto items-center justify-center">
            <Image src="/elements/empty_list.svg" alt="empty" width={120} height={135} />
          </div>
        )}
      </div>
      {/* Info: (20240926- tzuhan) Floating Upload Popup */}
      <FloatingUploadPopup uploadingCertificates={Object.values(uploadingCertificates)} />
    </>
  );
};

export default CertificateListBody;
