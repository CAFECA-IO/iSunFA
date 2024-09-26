import React, { useCallback, useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import Head from 'next/head';
import SideMenu from '@/components/upload_certificate/side_menu';
import Header from '@/components/upload_certificate/header';
import UploadArea from '@/components/upload_certificate/upload_area';
import Tabs from '@/components/tabs/tabs';
import FilterSection from '@/components/filter_section/filter_section';
import FloatingUploadPopup from '@/components/upload_certificate/floating_upload_popup';
import { APIName } from '@/constants/api_connection';
import SelectionToolbar from '@/components/selection_tool_bar/selection_tool_bar';
import { ICertificate, ICertificateUI, OPERATIONS, VIEW_TYPES } from '@/interfaces/certificate';
import Certificate from '@/components/certificate/certificate';
import CertificateEditModal from '@/components/certificate/certificate_edit_modal';

const UploadCertificatePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState<{ [tab: number]: { [id: number]: ICertificateUI } }>({
    0: {},
    1: {},
  });
  const [activeSelection, setActiveSelection] = React.useState<boolean>(false);
  const [viewType, setViewType] = useState<VIEW_TYPES>(VIEW_TYPES.LIST);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSelectedAll, setIsSelectedAll] = useState<{ [tab: number]: boolean }>({
    0: false,
    1: false,
  });

  const handleApiResponse = useCallback((resData: ICertificate[]) => {
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
        } else {
          acc[1] = {
            ...acc[1],
            [item.id]: {
              ...item,
              isSelected: false,
              actions: [OPERATIONS.DOWNLOAD],
            },
          };
        }
        return acc;
      },
      {} as { [tab: number]: { [id: number]: ICertificateUI } }
    );
    setData(certificates); // Info: (20240919 - tzuhan) 假設 API 回應中有 data 屬性
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

          {/* Info: (20240919 - tzuhan) Main Content */}
          <div className="space-y-4 overflow-y-scroll p-6">
            {/* Info: (20240919 - tzuhan) Upload Area */}
            <UploadArea isDisabled={false} withScanner />

            {/* Info: (20240919 - tzuhan) Tabs */}
            <Tabs
              tabs={['Certificates Pending Voucher', 'Certificates with Issued Voucher']}
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
              onActiveChange={setActiveSelection}
              items={Object.values(data[activeTab])}
              selectedCount={filterSelectedIds().length}
              totalCount={Object.values(data[activeTab]).length || 0}
              handleSelect={handleSelect}
              operations={activeTab === 0 ? [] : ['ADD_VOUCHER', 'ADD_ASSET', 'DELETE']}
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
        </div>

        {/* Info: (20240919 - tzuhan) Floating Upload Popup */}
        <FloatingUploadPopup />
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
