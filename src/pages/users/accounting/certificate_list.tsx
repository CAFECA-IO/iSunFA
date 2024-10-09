import React, { useCallback, useState, useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import Head from 'next/head';
import SideMenu from '@/components/upload_certificate/side_menu';
import Header from '@/components/upload_certificate/header';
import UploadArea from '@/components/upload_area/upload_area';
import Tabs from '@/components/tabs/tabs';
import FilterSection from '@/components/filter_section/filter_section';
import { APIName } from '@/constants/api_connection';
import SelectionToolbar from '@/components/selection_tool_bar/selection_tool_bar';
import {
  ICertificate,
  ICertificateInfo,
  ICertificateUI,
  OPERATIONS,
  VIEW_TYPES,
} from '@/interfaces/certificate';
import Certificate from '@/components/certificate/certificate';
import CertificateEditModal from '@/components/certificate/certificate_edit_modal';
import { getPusherInstance } from '@/lib/pusherClient';
import FloatingUploadPopup from '@/components/floating_upload_popup/floating_upload_popup';
import CertificateQRCodeModal from '@/components/certificate/certificate_qrcode_modal';
import APIHandler from '@/lib/utils/api_handler';
import { CERTIFICATE_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';
import useStateRef from 'react-usestateref';
import { useUserCtx } from '@/contexts/user_context';

const CertificateListPage: React.FC = () => {
  const { selectedCompany } = useUserCtx();
  const { id: companyId } = selectedCompany!;
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
  const [viewType, setViewType] = useState<VIEW_TYPES>(VIEW_TYPES.LIST);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSelectedAll, setIsSelectedAll] = useState<{ [tab: number]: boolean }>({
    0: false,
    1: false,
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [uploadingCertificates, setUploadingCertificates, uploadingCertificatesRef] = useStateRef<{
    [id: number]: ICertificateInfo;
  }>({});

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
    // Todo: (20240923 - tzuhan) Remove item
    // Deprecated: (20240923 - tzuhan) debugging purpose
    // eslint-disable-next-line no-console
    console.log('Remove single id:', id);
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

  const onEdit = useCallback(
    (id: number) => {
      // Deprecated: (20240923 - tzuhan) debugging purpose
      // eslint-disable-next-line no-console
      console.log('Edit selected id:', id);
      if (id === editingId) {
        setEditingId(null);
      } else {
        setEditingId(id);
      }
    },
    [editingId]
  );

  const handleSave = useCallback((certificate: ICertificateUI) => {
    // Deprecated: (20240923 - tzuhan) debugging purpose
    // eslint-disable-next-line no-console
    console.log('Save selected id:', certificate);
  }, []);

  const certificateHandler = useCallback(
    async (message: { token: string; certificate: ICertificateInfo }) => {
      const { token: receivedToken, certificate: certificateData } = message;
      // Deprecated: (20241011 - tzuhan) Debugging purpose
      // eslint-disable-next-line no-console
      console.log(
        `pusher got message, (token(${tokenRef.current})===_token${receivedToken})?${tokenRef.current === receivedToken} message:`,
        message
      );

      if (receivedToken === tokenRef.current) {
        const updatedCertificates = {
          ...uploadingCertificatesRef.current,
        };
        updatedCertificates[certificateData.id] = certificateData;
        setUploadingCertificates(updatedCertificates);
        // Deprecated: (20241011 - tzuhan) Debugging purpose
        // eslint-disable-next-line no-console
        console.log(`uploadingCertificatesRef.current:`, uploadingCertificatesRef.current);
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
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>Certificate List - iSunFA</title>
      </Head>
      <main className="flex h-screen w-screen overflow-hidden">
        {editingId && (
          <CertificateEditModal
            isOpen={!!editingId}
            onClose={() => setEditingId(null)}
            certificate={data[activeTab][editingId]}
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

        {/* Info: (20240919 - tzuhan) Side Menu */}
        <SideMenu />

        {/* Info: (20240919 - tzuhan) Main Content Area */}
        <div className="flex flex-1 flex-col">
          {/* Info: (20240919 - tzuhan) Header */}
          <Header />
          {/* Info: (20240919 - tzuhan) Main Content */}
          <div className="space-y-4 overflow-y-scroll p-6">
            {/* Info: (20240919 - tzuhan) Upload Area */}
            <UploadArea isDisabled={false} withScanner toggleQRCode={toggleQRCode} />
            {/* Info: (20240919 - tzuhan) Tabs */}
            <Tabs
              tabs={['Certificate Without Voucher', 'Certificate with Voucher']}
              activeTab={activeTab}
              onTabClick={(index: number) => setActiveTab(index)}
              counts={[Object.keys(data[0]).length, Object.keys(data[1]).length]}
            />

            {/* Info: (20240919 - tzuhan) Filter Section */}
            <FilterSection
              apiName={APIName.CERTIFICATE_LIST}
              types={['All', 'Invoice', 'Receipt']}
              // sortingOptions={[
              //   'Date (Newest)',
              //   'Date (Oldest)',
              //   'Amount (Lowest)',
              //   'Amount (Highest)',
              // ]}
              onApiResponse={handleApiResponse}
              viewType={viewType}
              viewToggleHandler={setViewType}
              sortingByDate
            />

            <SelectionToolbar
              active={activeSelection}
              isSelectable={activeTab === 0}
              onActiveChange={setActiveSelection}
              items={Object.values(data[activeTab])}
              itemType="Certificates"
              subtitle={`Invoice Total Price: ${sumPrice[activeTab]} TWD`}
              selectedCount={filterSelectedIds().length}
              totalCount={Object.values(data[activeTab]).length || 0}
              handleSelect={handleSelect}
              operations={activeTab === 0 ? [] : ['ADD_VOUCHER', 'DELETE']}
              onAddVoucher={handleAddVoucher}
              onAddAsset={handleAddAsset}
              onDelete={handleDelete}
              onDownload={handleDownload}
            />

            {/* Info: (20240919 - tzuhan) Certificate Table */}
            <Certificate
              data={Object.values(data[activeTab])}
              viewType={viewType}
              activeSelection={activeSelection}
              handleSelect={handleSelect}
              isSelectedAll={isSelectedAll[activeTab]}
              onDownload={onDownload}
              onRemove={onRemove}
              onEdit={onEdit}
            />
          </div>
          {/* Info: (20240926- tzuhan) Floating Upload Popup */}
          <FloatingUploadPopup
            uploadingCertificates={Object.values(uploadingCertificatesRef.current)}
          />
        </div>
      </main>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, [
      'common',
      'journal',
      'kyc',
      'project',
      'report_401',
      'salary',
      'setting',
      'terms',
    ])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default CertificateListPage;
