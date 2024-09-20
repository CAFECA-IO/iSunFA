import React, { useState } from 'react';
import Head from 'next/head';
import SideMenu from '@/components/upload_certificate/side_menu';
import Header from '@/components/upload_certificate/header';
import UploadArea from '@/components/upload_certificate/upload_area';
import Tabs from '@/components/upload_certificate/tabs';
import FilterSection from '@/components/upload_certificate/filter_section';
import CertificateTable from '@/components/upload_certificate/certificate_table';
import FloatingUploadPopup from '@/components/upload_certificate/floating_upload_popup';
import { APIName } from '@/constants/api_connection';

const UploadCertificatePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState<unknown[]>([]);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');

  const handleApiResponse = (resData: unknown[]) => {
    setData(resData); // Info: (20240919 - tzuhan) 假設 API 回應中有 data 屬性
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Head>
        <title>Upload Certificate</title>
      </Head>

      {/* Info: (20240919 - tzuhan) Side Menu */}
      <SideMenu />

      {/* Info: (20240919 - tzuhan) Main Content Area */}
      <div className="flex flex-1 flex-col bg-gray-100">
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
            types={['Invoice', 'Receipt']}
            sortingOptions={[
              'Date Ascending',
              'Date Descending',
              'Amount Ascending',
              'Amount Descending',
            ]}
            onApiResponse={handleApiResponse}
            viewType={viewType}
            viewToggleHandler={setViewType}
          />

          {/* Info: (20240919 - tzuhan) Certificate Table */}
          <CertificateTable data={data} />
        </div>
      </div>

      {/* Info: (20240919 - tzuhan) Floating Upload Popup */}
      <FloatingUploadPopup />
    </div>
  );
};

export default UploadCertificatePage;
