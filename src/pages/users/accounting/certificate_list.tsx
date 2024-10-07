import React, { useCallback, useState, useEffect } from 'react';
import { useQRCode } from 'next-qrcode';
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
import { ICertificate, ICertificateUI, OPERATIONS, VIEW_TYPES } from '@/interfaces/certificate';
import Certificate from '@/components/certificate/certificate';
import CertificateEditModal from '@/components/certificate/certificate_edit_modal';
import Pusher, { Channel } from 'pusher-js';
import Image from 'next/image';
import { ISUNFA_ROUTE } from '@/constants/url';

interface ImageData {
  url: string;
  status: string;
}
const UploadCertificatePage: React.FC = () => {
  const { Canvas } = useQRCode();
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
  const [receivedImages, setReceivedImages] = useState<ImageData[]>([]);

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

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER!,
    });

    const channel: Channel = pusher.subscribe('certificate-channel');

    const imageHandler = (imageData: { images: ImageData[] }) => {
      setReceivedImages((prev) => [...prev, ...imageData.images]);
    };

    channel.bind('certificate-event', imageHandler);

    return () => {
      channel.unbind('certificate-event', imageHandler);
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

        {/* Info: (20240919 - tzuhan) Side Menu */}
        <SideMenu />

        {/* Info: (20240919 - tzuhan) Main Content Area */}
        <div className="flex flex-1 flex-col">
          {/* Info: (20240919 - tzuhan) Header */}
          <Header />

          {showQRCode && (
            <Canvas
              text={`http://192.168.71.34:3000/${ISUNFA_ROUTE.UPLOAD}`}
              options={{
                errorCorrectionLevel: 'M',
                margin: 3,
                scale: 4,
                width: 200,
                color: {
                  dark: '#010599FF',
                  light: '#FFBF60FF',
                },
              }}
            />
          )}
          {/* Info: (20240919 - tzuhan) Main Content */}
          <div className="space-y-4 overflow-y-scroll p-6">
            {/* Info: (20240919 - tzuhan) Upload Area */}
            <UploadArea
              isDisabled={false}
              withScanner
              toggleQRCode={() => setShowQRCode((prev) => !prev)}
            />
            <div>
              {receivedImages.map((image, index) => (
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
              subtitle={`Invoice Total Price: ${sumPrice} TWD`}
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
              activeTab={activeTab}
              activeSelection={activeSelection}
              handleSelect={handleSelect}
              isSelectedAll={isSelectedAll[activeTab]}
              onDownload={onDownload}
              onRemove={onRemove}
              onEdit={onEdit}
            />
          </div>
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
