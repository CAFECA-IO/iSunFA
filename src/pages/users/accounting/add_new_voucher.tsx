import React, { useCallback, useState } from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import NewVoucherForm from '@/components/voucher/new_voucher_form';
import { ICertificate, ICertificateUI } from '@/interfaces/certificate';
import CertificateSelectorModal from '@/components/certificate/certificate_selector_modal';
import CertificateUploaderModal from '@/components/certificate/certificate_uoloader_modal';
import AIAnalyzer from '@/components/ai_analyzer/ai_analyzer';
import CertificateSelection from '@/components/certificate/certificate_selection';

// Info: (20241009 - Julian) For layout testing, to be removed
enum SidebarState {
  COLLAPSED = 'collapsed',
  OPEN = 'open',
  EXPANDED = 'expanded',
}

const AddNewVoucherPage: React.FC = () => {
  const { t } = useTranslation('common');

  const [sidebarState, setSidebarState] = useState<SidebarState>(SidebarState.OPEN);
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

  const isSidebarCollapsed = sidebarState === SidebarState.COLLAPSED;
  const isSidebarOpen = sidebarState === SidebarState.OPEN;
  const isSidebarExpanded = sidebarState === SidebarState.EXPANDED;

  const toggleSidebar = () => {
    if (isSidebarCollapsed) {
      setSidebarState(SidebarState.OPEN);
    } else {
      setSidebarState(SidebarState.COLLAPSED);
    }
  };

  const expandSidebar = () => {
    if (isSidebarOpen) {
      setSidebarState(SidebarState.EXPANDED);
    } else {
      setSidebarState(SidebarState.OPEN);
    }
  };

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('journal:ADD_NEW_VOUCHER.PAGE_TITLE')} - iSunFA</title>
      </Head>

      <button type="button" onClick={toggleSidebar} className="absolute top-0 z-60 bg-rose-300">
        Sidebar Toggle
      </button>

      <div className="fixed z-50 flex">
        <div
          className={`${!isSidebarCollapsed ? 'w-280px' : 'w-0'} flex h-screen flex-col items-center justify-center overflow-hidden bg-surface-neutral-surface-lv2 transition-all duration-300 ease-in-out`}
        >
          This is sidebar
          <button type="button" onClick={expandSidebar} className="bg-teal-500">
            Expand Toggle
          </button>
        </div>
        <div
          className={`flex ${isSidebarExpanded ? 'w-280px' : 'w-0'} h-screen items-center justify-center overflow-hidden bg-gray-400 text-white transition-all duration-300 ease-in-out`}
        >
          Expand Area
        </div>
      </div>
      <div
        className={`${isSidebarExpanded ? 'ml-560px' : isSidebarOpen ? 'ml-280px' : 'ml-0'} bg-text-neutral-secondary p-20px text-center text-white transition-all duration-300 ease-in-out`}
      >
        This is header
      </div>

      {/* Info: (20240925 - Julian) Body */}
      <main
        className={`${isSidebarExpanded ? 'pl-560px' : isSidebarOpen ? 'pl-280px' : 'pl-0'} flex w-screen flex-col overflow-y-auto bg-surface-neutral-main-background font-barlow transition-all duration-300 ease-in-out`}
      >
        <div className="relative flex flex-col px-10">
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
          <NewVoucherForm />
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
      'asset',
    ])),
    locale,
  },
});

export const getStaticProps = getStaticPropsFunction;

export default AddNewVoucherPage;
