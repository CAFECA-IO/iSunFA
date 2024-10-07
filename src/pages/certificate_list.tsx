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
import Pusher, { Channel } from 'pusher-js';
import FloatingUploadPopup from '@/components/floating_upload_popup/floating_upload_popup';
import CertificateQRCodeModal from '@/components/certificate/certificate_qrcode_modal';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { ProgressStatus } from '@/constants/account';

const UploadCertificatePage: React.FC = () => {
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
  const token = uuidv4(); // Info: (20241007 - tzuhan) 生成唯一 token
  const [uploadingCertificates, setUploadingCertificates] = useState<ICertificateInfo[]>([]);

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

  const certificateHandler = async (certificateData: { url: string; token: string }) => {
    // TODO: (20241007 - tzuhan) post certificate data to server and get uploading certificate list back and update certificate list when uploaded
    // TODO: (20241007 - tzuhan) get Token from server
    if (certificateData.token === token) {
      // Info: (20241007 - tzuhan) 使用 fetch 下載圖片文件
      const response = await fetch(certificateData.url);
      const blob = await response.blob();

      // Info: (20241007 - tzuhan) 獲取文件名，從 response headers 提取
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = 'unknown';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match && match[1]) {
          // Info: (20241007 - tzuhan) 使用陣列解構提取文件名
          [, fileName] = match;
        }
      } else {
        // Info: (20241007 - tzuhan) 如果沒有提供 header，可以從 url 推斷出文件名
        fileName = certificateData.url.split('/').pop() || 'unknown';
      }

      // Info: (20241007 - tzuhan) 獲取文件大小
      const fileSize = blob.size;

      const imageObjectUrl = URL.createObjectURL(blob);
      setUploadingCertificates((prev) => [
        ...prev,
        {
          url: imageObjectUrl,
          status: ProgressStatus.IN_PROGRESS,
          name: fileName,
          size: fileSize,
          progress: 80,
        },
      ]);
    }
  };

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: '',
      wsHost: process.env.NEXT_PUBLIC_PUSHER_HOST!,
      wsPort: parseFloat(process.env.NEXT_PUBLIC_PUSHER_PORT!),
    });

    const channel: Channel = pusher.subscribe('certificate-channel');

    channel.bind('certificate-event', certificateHandler);

    return () => {
      channel.unbind('certificate-event', certificateHandler);
      pusher.unsubscribe('certificate-channel');
    };
  }, []);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>Upload Certificate - iSunFA</title>
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
        {showQRCode && (
          <CertificateQRCodeModal
            isOpen={showQRCode}
            onClose={() => setShowQRCode((prev) => !prev)}
            isOnTopOfModal={false}
            token={token}
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
            <UploadArea
              isDisabled={false}
              withScanner
              toggleQRCode={() => setShowQRCode((prev) => !prev)}
            />
            <div>
              {uploadingCertificates.map((image, index) => (
                <div key={`pusher_${index + 1}`}>
                  <Image src={image.url} alt={`Received Image ${index}`} width={200} height={200} />
                  <p>Status: {image.status}</p>
                </div>
              ))}
            </div>

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
          {uploadingCertificates.length > 0 && (
            <FloatingUploadPopup uploadingCertificates={uploadingCertificates} />
          )}
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

export default UploadCertificatePage;
