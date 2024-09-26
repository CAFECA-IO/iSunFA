import React, { useState } from 'react';
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
  const [data, setData] = useState<{ [id: number]: ICertificateUI }>({});
  const [activeSelection, setActiveSelection] = React.useState<boolean>(false);
  const [viewType, setViewType] = useState<VIEW_TYPES>(VIEW_TYPES.LIST);
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleApiResponse = (resData: ICertificate[]) => {
    const certificates = resData.reduce(
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
    setData(certificates); // Info: (20240919 - tzuhan) 假設 API 回應中有 data 屬性
  };

  const handleSelect = (ids: number[], isSelected: boolean) => {
    // Deprecated: (20240920 - tzuhan) debugging purpose
    // eslint-disable-next-line no-console
    console.log('handleSelect', ids, isSelected);
    const updatedData = {
      ...data,
    };
    ids.forEach((id) => {
      updatedData[id] = {
        ...updatedData[id],
        isSelected,
      };
    });
    setData(updatedData);
  };

  const filterSelectedIds = () => {
    return Object.keys(data).filter((id) => data[parseInt(id, 10)].isSelected);
  };

  const handleAddVoucher = () => {
    // Todo: (20240920 - tzuhan) Add voucher
    // Deprecated: (20240920 - tzuhan) debugging purpose
    // eslint-disable-next-line no-console
    console.log('Add voucher on selected ids:', filterSelectedIds());
  };

  const handleAddAsset = () => {
    // Todo: (20240920 - tzuhan) Add asset
    // Deprecated: (20240920 - tzuhan) debugging purpose
    // eslint-disable-next-line no-console
    console.log('Add asset on selected ids:', filterSelectedIds());
  };

  const onRemove = (id: number) => {
    // Todo: (20240923 - tzuhan) Remove item
    // Deprecated: (20240923 - tzuhan) debugging purpose
    // eslint-disable-next-line no-console
    console.log('Remove single id:', id);
  };

  const handleDelete = () => {
    // Todo: (20240920 - tzuhan) Delete items
    Object.keys(data).forEach((id) => {
      if (data[parseInt(id, 10)].isSelected) {
        // Deprecated: (20240920 - tzuhan) debugging purpose
        // eslint-disable-next-line no-console
        console.log('Delete selected id:', id);
      }
    });
  };

  const onDownload = (id: number) => {
    // TODO: (20240923 - tzuhan) 下載單個項目
    // Deprecated: (20240923 - tzuhan) debugging purpose
    // eslint-disable-next-line no-console
    console.log('Download single id:', id);
  };

  // Info: (20240923 - tzuhan) 下載選中項目
  const handleDownload = () => {
    // TODO: (20240923 - tzuhan) 下載選中的項目
    Object.keys(data).forEach((id) => {
      if (data[parseInt(id, 10)].isSelected) {
        // Deprecated: (20240923 - tzuhan) debugging purpose
        // eslint-disable-next-line no-console
        console.log('Download selected id:', id);
      }
    });
  };

  const onEdit = (id: number) => {
    // Deprecated: (20240920 - tzuhan) debugging purpose
    Object.keys(data).forEach((id) => {
      if (data[parseInt(id, 10)].isSelected) {
        // eslint-disable-next-line no-console
        console.log('Delete selected id:', id);
      }
    });
  };

  const onDownload = (id: number) => {
    // TODO: (20240923 - tzuhan) 下載單個項目
    // Deprecated: (20240923 - tzuhan) debugging purpose
    // eslint-disable-next-line no-console
    console.log('Download single id:', id);
  };

  // Info: (20240923 - tzuhan) 下載選中項目
  const handleDownload = () => {
    // TODO: (20240923 - tzuhan) 下載選中的項目
    Object.keys(data).forEach((id) => {
      if (data[parseInt(id, 10)].isSelected) {
        // Deprecated: (20240923 - tzuhan) debugging purpose
        // eslint-disable-next-line no-console
        console.log('Download selected id:', id);
      }
    });
  };

  const onEdit = (id: number) => {
    // Deprecated: (20240923 - tzuhan) debugging purpose
    // eslint-disable-next-line no-console
    console.log('Edit selected id:', id);
    if (id === editingId) {
      setEditingId(null);
    } else {
      setEditingId(id);
    }
  };

  const handleSave = (certificate: ICertificateUI) => {
    // Deprecated: (20240920 - tzuhan) debugging purpose
    // eslint-disable-next-line no-console
    console.log('Save selected id:', certificate);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {editingId && (
        <CertificateEditModal
          isOpen={!!editingId}
          onClose={() => setEditingId(null)}
          certificate={data[editingId]}
          onSave={handleSave}
        />
      )}
      <Head>
        <title>Upload Certificate</title>
      </Head>

      {/* Info: (20240919 - tzuhan) Side Menu */}
      <SideMenu />

      {/* Info: (20240919 - tzuhan) Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Info: (20240919 - tzuhan) Header */}
        <Header />

        {/* Info: (20240919 - tzuhan) Main Content */}
        <div className="space-y-4 overflow-scroll p-6">
          {/* Info: (20240919 - tzuhan) Upload Area */}
          <UploadArea />

          {/* Info: (20240919 - tzuhan) Tabs */}
          <Tabs
            tabs={['Certificates Pending Voucher', 'Certificates with Issued Voucher']}
            activeTab={activeTab}
            onTabClick={(index: number) => setActiveTab(index)}
            counts={[0, 1]}
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
            items={Object.values(data)}
            selectedCount={filterSelectedIds().length}
            totalCount={Object.values(data).length || 0}
            handleSelect={handleSelect}
            operations={activeTab === 0 ? [] : ['ADD_VOUCHER', 'ADD_ASSET', 'DELETE']}
            onAddVoucher={handleAddVoucher}
            onAddAsset={handleAddAsset}
            onDelete={handleDelete}
            onDownload={handleDownload}
          />

          {/* Info: (20240919 - tzuhan) Certificate Table */}
          <Certificate
            data={Object.values(data)}
            viewType={viewType}
            activeSelection={activeSelection}
            handleSelect={handleSelect}
            onDownload={onDownload}
            onRemove={onRemove}
            onEdit={onEdit}
          />
        </div>
      </div>

      {/* Info: (20240919 - tzuhan) Floating Upload Popup */}
      <FloatingUploadPopup />
    </div>
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
      'asset',
    ])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default UploadCertificatePage;
