import React, { useCallback, useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import Head from 'next/head';
import SideMenu from '@/components/upload_certificate/side_menu';
import Header from '@/components/upload_certificate/header';
import CertificateSelectorModal from '@/components/certificate/certificate_selector_modal';
import { ICertificate, ICertificateUI } from '@/interfaces/certificate';
import AIAnalyzer from '@/components/ai_analyzer/ai_analyzer';
import CertificateSelection from '@/components/certificate/certificate_selection';
import CertificateUploaderModal from '@/components/certificate/certificate_uoloader_modal';

const AddVoucherPage: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState<boolean | undefined>(undefined);
  const [isAnalyzSuccess, setIsAnalyzSuccess] = useState<boolean>(false);
  const [openSelectorModal, setOpenSelectorModal] = useState<boolean>(false);
  const [openUploaderModal, setOpenUploaderModal] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);

  const [certificates, setCertificates] = useState<{ [id: string]: ICertificateUI }>({});
  const [selectedCertificates, setSelectedCertificates] = useState<ICertificateUI[]>([]);

  const handleSelect = useCallback(
    (ids: number[], isSelected: boolean) => {
      const updatedData = {
        ...certificates,
      };
      ids.forEach((id) => {
        updatedData[id] = {
          ...updatedData[id],
          isSelected,
        };
      });
      setCertificates(updatedData);
      setSelectedCertificates(
        Object.values(updatedData).filter((item) => item.isSelected) as ICertificateUI[]
      );
      setIsAnalyzing(selectedCertificates.length > 0 && isSelected);
      setTimeout(() => {
        setIsAnalyzing(false);
        setIsAnalyzSuccess(selectedCertificates.length > 0);
      }, 2000);
    },
    [certificates]
  );

  const handleOpenSelectorModal = useCallback(() => {
    setSelectedIds(selectedCertificates.map((item) => item.id));
    setOpenSelectorModal(true);
  }, [selectedCertificates]);

  const onBack = useCallback(() => {
    handleOpenSelectorModal();
    setOpenUploaderModal(false);
  }, []);

  const handleApiResponse = useCallback((resData: ICertificate[]) => {
    // Deprecated: (20240920 - tzuhan) Debugging purpose only
    // eslint-disable-next-line no-console
    console.log(`resData`, resData, `selectedCertificates`, selectedCertificates);
    const data = resData.reduce(
      (acc, item) => {
        acc[item.id] = {
          ...item,
          isSelected: selectedCertificates.some((selectedItem) => selectedItem.id === item.id),
          actions: [],
        };
        return acc;
      },
      {} as { [id: string]: ICertificateUI }
    );
    setCertificates(data);
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
        <CertificateSelectorModal
          isOpen={openSelectorModal}
          onClose={() => setOpenSelectorModal(false)}
          openUploaderModal={() => setOpenUploaderModal(true)}
          handleSelect={handleSelect}
          handleApiResponse={handleApiResponse}
          certificates={Object.values(certificates)}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
        />
        <CertificateUploaderModal
          isOpen={openUploaderModal}
          onClose={() => setOpenUploaderModal(false)}
          onBack={onBack}
        />
        {/* Info: (20240919 - tzuhan) Side Menu */}
        <SideMenu />

        {/* Info: (20240919 - tzuhan) Main Content Area */}
        <div className="flex flex-1 flex-col">
          {/* Info: (20240919 - tzuhan) Header */}
          <Header title="Voucher-id" />

          {/* Info: (20240919 - tzuhan) Main Content */}
          <div className="px-6">
            {/* Info: (20240926 - tzuhan) AIAnalyzer */}
            <AIAnalyzer isAnalyzing={isAnalyzing} isAnalyzSuccess={isAnalyzSuccess} />

            {/* Info: (20240926 - tzuhan) CertificateSelection */}
            <CertificateSelection
              selectedCertificates={selectedCertificates}
              setOpenModal={handleOpenSelectorModal}
              isSelectable
              isDeletable
              className="my-8"
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

export default AddVoucherPage;
