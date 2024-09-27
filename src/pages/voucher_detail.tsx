import React from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import Head from 'next/head';
import SideMenu from '@/components/upload_certificate/side_menu';
import Header from '@/components/upload_certificate/header';
import { generateRandomCertificates, ICertificateUI, OPERATIONS } from '@/interfaces/certificate';
import CertificateSelection from '@/components/certificate/certificate_selection';
import { Button } from '@/components/button/button';
import Image from 'next/image';

const AddVoucherPage: React.FC = () => {
  const selectedCertificates: ICertificateUI[] = generateRandomCertificates(0).map(
    (certificate) => {
      const actions = [OPERATIONS.DOWNLOAD, OPERATIONS.REMOVE];
      return {
        ...certificate,
        isSelected: false,
        actions,
      };
    }
  );

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>Upload Certificate - iSunFA</title>
      </Head>
      <main className="flex h-screen w-screen overflow-hidden">
        {/* Info: (20240919 - tzuhan) Side Menu */}
        <SideMenu />

        {/* Info: (20240919 - tzuhan) Main Content Area */}
        <div className="flex flex-1 flex-col">
          {/* Info: (20240919 - tzuhan) Header */}
          <Header />

          {/* Info: (20240919 - tzuhan) Main Content */}
          <div className="px-6">
            <div className="flex justify-end gap-2 p-4">
              <Button type="button" variant="tertiary" className="p-2">
                <Image src="/elements/downloader.svg" alt="⬇" width={16} height={16} />
              </Button>
              <Button type="button" variant="tertiary" className="p-2">
                <Image
                  src="/elements/edit.svg"
                  width={16}
                  height={16}
                  alt="elements"
                  className="invert"
                />
              </Button>
              <Button type="button" variant="tertiary" className="p-2">
                <Image src="/elements/printer.svg" width={16} height={16} alt="elements" />
              </Button>
            </div>
            {/* Info: (20240926 - tzuhan) CertificateSelection */}
            <CertificateSelection
              selectedCertificates={selectedCertificates}
              isSelectable={false}
              isDeletable
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
