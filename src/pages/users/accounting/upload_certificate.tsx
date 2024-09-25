import React, { useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import Head from 'next/head';
import SideMenu from '@/components/upload_certificate/side_menu';
import Header from '@/components/upload_certificate/header';
import UploadArea from '@/components/upload_certificate/upload_area';
import Tabs from '@/components/upload_certificate/tabs';
import FilterSection from '@/components/filter_section/filter_section';
import CertificateTable from '@/components/upload_certificate/certificate_table';
import FloatingUploadPopup from '@/components/upload_certificate/floating_upload_popup';
import { APIName } from '@/constants/api_connection';
import SelectionToolbar from '@/components/selection_tool_bar/selection_tool_bar';
import { ICertificate } from '@/interfaces/certificate';

const UploadCertificatePage: React.FC = () => {
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState<ICertificate[]>([]);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');

  const handleApiResponse = (resData: ICertificate[]) => {
    setData(resData); // Info: (20240919 - tzuhan) 假設 API 回應中有 data 屬性
  };

  const handleAddVoucher = () => {
    // Todo: (20240920 - tzuhan) Add voucher
    // Deprecated: (20240920 - tzuhan) debugging purpose
    // eslint-disable-next-line no-console
    console.log('Add voucher on selected ids:', selectedItemIds);
  };

  const handleAddAsset = () => {
    // Todo: (20240920 - tzuhan) Add asset
    // Deprecated: (20240920 - tzuhan) debugging purpose
    // eslint-disable-next-line no-console
    console.log('Add asset on selected ids:', selectedItemIds);
  };

  const handleDelete = () => {
    // Todo: (20240920 - tzuhan) Delete items
    // Deprecated: (20240920 - tzuhan) debugging purpose
    // eslint-disable-next-line no-console
    console.log('Delete selected ids:', selectedItemIds);
    setData(data.filter((item) => !selectedItemIds.includes(item.id)));
  };

  return (
    <div className="flex h-screen overflow-hidden">
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
            items={data}
            selectedItemIds={selectedItemIds}
            totalCount={data.length || 0}
            onSelectionChange={setSelectedItemIds}
            operations={activeTab === 0 ? [] : ['ADD_VOUCHER', 'ADD_ASSET', 'DELETE']}
            onAddVoucher={handleAddVoucher}
            onAddAsset={handleAddAsset}
            onDelete={handleDelete}
          />

          {/* Info: (20240919 - tzuhan) Certificate Table */}
          {viewType === 'list' && <CertificateTable data={data} />}
          {viewType === 'grid' && <div>Todo</div>}
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
