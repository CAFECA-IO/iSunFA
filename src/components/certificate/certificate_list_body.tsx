import React, { useCallback, useState, useEffect } from 'react';
import useStateRef from 'react-usestateref';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import {
  ICertificate,
  ICertificateMeta,
  ICertificateUI,
  OPERATIONS,
} from '@/interfaces/certificate';
import { DISPLAY_LIST_VIEW_TYPE } from '@/constants/display';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { getPusherInstance } from '@/lib/pusherClient';
import { CERTIFICATE_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';
import UploadArea from '@/components/upload_area/upload_area';
import Tabs from '@/components/tabs/tabs';
import FilterSection from '@/components/filter_section/filter_section';
import SelectionToolbar from '@/components/selection_tool_bar/selection_tool_bar';
import Certificate from '@/components/certificate/certificate';
import CertificateEditModal from '@/components/certificate/certificate_edit_modal';
import FloatingUploadPopup from '@/components/floating_upload_popup/floating_upload_popup';
import CertificateQRCodeModal from '@/components/certificate/certificate_qrcode_modal';
import Image from 'next/image';
import { ProgressStatus } from '@/constants/account';
import { useModalContext } from '@/contexts/modal_context';
import { MessageType } from '@/interfaces/message_modal';
import { ToastId } from '@/constants/toast_id';
import { ToastType } from '@/interfaces/toastify';

interface CertificateListBodyProps {}

const CertificateListBody: React.FC<CertificateListBodyProps> = () => {
  const { t } = useTranslation('certificate');
  const { selectedCompany } = useUserCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();
  const companyId = selectedCompany?.id || 12345; // Deprecated: (202401016 - tzuhan) Development purpose
  const { trigger: encryptAPI } = APIHandler<string>(APIName.ENCRYPT);
  const [token, setToken, tokenRef] = useStateRef<string | undefined>(undefined);
  const [showQRCode, setShowQRCode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState<{ [tab: number]: { [id: number]: ICertificateUI } }>({
    0: {},
    1: {},
  });
  const [sumPrice, setSumPrice] = useState<{ [tab: number]: number }>({
    0: 0,
    1: 0,
  });
  const [activeSelection, setActiveSelection] = React.useState<boolean>(false);
  const [viewType, setViewType] = useState<DISPLAY_LIST_VIEW_TYPE>(DISPLAY_LIST_VIEW_TYPE.LIST);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSelectedAll, setIsSelectedAll] = useState<{ [tab: number]: boolean }>({
    0: false,
    1: false,
  });
  // TODO: (20241016 - tzuhan) remove test data
  const [uploadingCertificates, setUploadingCertificates] = useState<{
    [id: number]: ICertificateMeta;
  }>({
    0: {
      id: 0,
      name: 'test.pdf',
      size: 1000,
      url: `images/demo_certifate.png`,
      status: ProgressStatus.IN_PROGRESS,
      progress: 50,
    },
    1: {
      id: 1,
      size: 1000,
      url: `images/demo_certifate.png`,
      name: 'test2.pdf',
      status: ProgressStatus.PAUSED,
      progress: 0,
    },
    2: {
      id: 2,
      size: 1000,
      url: `images/demo_certifate.png`,
      name: 'test3.pdf',
      status: ProgressStatus.FAILED,
      progress: 98,
    },
    3: {
      id: 3,
      size: 1000,
      url: `images/demo_certifate.png`,
      name: 'test4.pdf',
      status: ProgressStatus.SUCCESS,
      progress: 100,
    },
  });

  const handleApiResponse = useCallback((resData: ICertificate[]) => {
    const sumInvoiceTotalPrice = {
      0: 0,
      1: 0,
    };
    const certificates = resData.reduce(
      (acc, item) => {
        if (!item.voucherNo) {
          acc[0] = {
            ...acc[0],
            [item.id]: {
              ...item,
              isSelected: false,
              actions: [OPERATIONS.DOWNLOAD, OPERATIONS.REMOVE],
            },
          };
          sumInvoiceTotalPrice[0] += item.totalPrice;
        } else {
          acc[1] = {
            ...acc[1],
            [item.id]: {
              ...item,
              isSelected: false,
              actions: [OPERATIONS.DOWNLOAD],
            },
          };
          sumInvoiceTotalPrice[1] += item.totalPrice;
        }
        return acc;
      },
      {} as { [tab: number]: { [id: number]: ICertificateUI } }
    );
    setData(certificates); // Info: (20240919 - tzuhan) 假設 API 回應中有 data 屬性
    setSumPrice(sumInvoiceTotalPrice);
  }, []);

  const handleSelect = useCallback(
    (ids: number[], isSelected: boolean) => {
      const updatedData = {
        ...data[activeTab],
      };
      if (ids.length === Object.keys(updatedData).length) {
        setIsSelectedAll({
          ...isSelectedAll,
          [activeTab]: isSelected,
        });
      } else {
        setIsSelectedAll({
          ...isSelectedAll,
          [activeTab]: false,
        });
      }
      ids.forEach((id) => {
        updatedData[id] = {
          ...updatedData[id],
          isSelected,
        };
      });
      setData({
        ...data,
        [activeTab]: updatedData,
      });
    },
    [data, activeTab, isSelectedAll]
  );

  const filterSelectedIds = useCallback(() => {
    return Object.keys(data[activeTab]).filter(
      (id) => data[activeTab][parseInt(id, 10)].isSelected
    );
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
      notes: `${data[activeTab][id].invoiceName}?`,
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
    Object.keys(data[activeTab]).forEach((id) => {
      if (data[activeTab][parseInt(id, 10)].isSelected) {
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
    Object.keys(data[activeTab]).forEach((id) => {
      if (data[activeTab][parseInt(id, 10)].isSelected) {
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

  const handleSave = useCallback((certificate: ICertificateUI) => {
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

    return () => {
      channel.unbind(CERTIFICATE_EVENT.UPLOAD, certificateHandler);
      pusher.unsubscribe(PRIVATE_CHANNEL.CERTIFICATE);
    };
  }, [certificateHandler]);
  return (
    <>
      {isEditModalOpen && (
        <CertificateEditModal
          isOpen={isEditModalOpen}
          toggleIsEditModalOpen={setIsEditModalOpen}
          certificate={editingId ? data[activeTab][editingId] : undefined}
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
        className={`flex grow flex-col gap-4 ${data[activeTab] && Object.values(data[activeTab]).length > 0 ? 'overflow-y-scroll' : ''} `}
      >
        {/* Info: (20240919 - tzuhan) Upload Area */}
        <UploadArea isDisabled={false} withScanner toggleQRCode={toggleQRCode} />
        {/* Info: (20240919 - tzuhan) Tabs */}
        <Tabs
          tabs={[t('certificate:TAB.WITHOUT_VOUCHER'), t('certificate:TAB.WITH_VOUCHER')]}
          activeTab={activeTab}
          onTabClick={(index: number) => setActiveTab(index)}
          counts={[Object.keys(data[0]).length, Object.keys(data[1]).length]}
        />

        {/* Info: (20240919 - tzuhan) Filter Section */}
        <FilterSection
          className="mt-2"
          apiName={APIName.CERTIFICATE_LIST}
          types={['All', 'Invoice', 'Receipt']}
          onApiResponse={handleApiResponse}
          viewType={viewType}
          viewToggleHandler={setViewType}
        />

        {/* Info: (20240919 - tzuhan) Certificate Table */}
        {data[activeTab] && Object.values(data[activeTab]).length > 0 ? (
          <>
            <SelectionToolbar
              className="mt-6"
              active={activeSelection}
              isSelectable={activeTab === 0}
              onActiveChange={setActiveSelection}
              items={Object.values(data[activeTab])}
              itemType="Certificates"
              subtitle={`${t('INVOICE_TOTAL_PRRICE')}:`}
              totalPrice={sumPrice[activeTab]}
              currency="TWD"
              selectedCount={filterSelectedIds().length}
              totalCount={Object.values(data[activeTab]).length || 0}
              handleSelect={handleSelect}
              operations={activeTab === 1 ? [] : ['ADD_VOUCHER', 'DELETE']}
              onAddVoucher={handleAddVoucher}
              onAddAsset={handleAddAsset}
              onDelete={handleDelete}
              onDownload={handleDownload}
            />
            <Certificate
              activeTab={activeTab}
              data={Object.values(data[activeTab])}
              viewType={viewType}
              activeSelection={activeSelection}
              handleSelect={handleSelect}
              isSelectedAll={isSelectedAll[activeTab]}
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
