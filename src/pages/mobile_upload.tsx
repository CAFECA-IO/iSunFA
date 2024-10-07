import { useRouter } from 'next/router';
import { Button } from '@/components/button/button';
import Head from 'next/head';
import Image from 'next/image';
import { useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { ICertificateData } from '@/interfaces/certificate';
import { ProgressStatus } from '@/constants/account';

interface FileWithUrl extends File {
  url: string;
}

const MobileUploadPage: React.FC = () => {
  const router = useRouter();
  const { query } = router;
  const { token } = query;
  const [selectedCertificates, setSelectedCertificates] = useState<FileWithUrl[]>([]);
  const [uploadedCertificates, setUploadedCertificates] = useState<ICertificateData[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleCertificateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedCertificates(
        Array.from(e.target.files).map((file) => {
          return {
            ...file,
            url: URL.createObjectURL(file),
          };
        })
      );
    }
  };

  const uploadCertificates = async () => {
    setIsUploading(true);

    // Info: (20241007 - tzuhan) 使用 FormData 上傳文件
    const formData = new FormData();
    selectedCertificates.forEach((certificate) => {
      formData.append('file', certificate);
    });

    try {
      const response = await fetch('/api/v2/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error('Failed to upload certificates');
      }

      // Deprecated: (20241011 - tzuhan) Debugging purpose
      // eslint-disable-next-line no-console
      console.log('data:', data);

      const { certificates } = data;
      certificates.forEach(async (certificate: { fileUrl: string }) => {
        const certificateUpload = {
          url: certificate.fileUrl,
          token: token as string,
          status: ProgressStatus.IN_PROGRESS,
        };

        setUploadedCertificates([...uploadedCertificates, certificateUpload]);

        // Deprecated: (20241011 - tzuhan) Debugging purpose
        // eslint-disable-next-line no-console
        console.log('certificates:', certificateUpload);

        // Info: (20241007 - tzuhan) 通過 Pusher 傳送圖片 URL 和 token
        await fetch('/api/v2/pusher', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ certificate: certificateUpload }),
        });
      });

      setSelectedCertificates([]);
    } catch (error) {
      // Deprecated: (20241011 - tzuhan) Debugging purpose
      // eslint-disable-next-line no-console
      console.error('Error uploading certificates:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>Upload Certificate - iSunFA</title>
      </Head>
      <main>
        <h1>Upload Certificates</h1>
        <input type="file" accept="image/*" multiple onChange={handleCertificateChange} />
        <Button
          onClick={uploadCertificates}
          disabled={isUploading || selectedCertificates.length === 0}
        >
          {isUploading ? 'Uploading...' : 'Send Certificates'}
        </Button>
        <div>
          <h2>Selected Certificates</h2>
          <div className="flex flex-row gap-2">
            {selectedCertificates.map((certificate, index) => (
              <div key={`pusher_mobile_${index + 1}`}>
                <Image
                  src={certificate.url}
                  alt={`Uploaded Certificate ${index}`}
                  width={200}
                  height={200}
                />
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2>Uploaded Certificates</h2>
          <div className="flex flex-row gap-2">
            {uploadedCertificates.map((certificate, index) => (
              <div key={`pusher_mobile_${index + 1}`}>
                {certificate.status !== ProgressStatus.SYSTEM_ERROR ? (
                  <Image
                    src={certificate.url}
                    alt={`Uploaded Certificate ${index}`}
                    width={200}
                    height={200}
                  />
                ) : (
                  <p>Certificate {index + 1} upload failed</p>
                )}
                <p>Status: {certificate.status}</p>
              </div>
            ))}
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

export default MobileUploadPage;
