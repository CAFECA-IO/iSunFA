import { useRouter } from 'next/router';
import { Button } from '@/components/button/button';
import Head from 'next/head';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { ICertificateInfo } from '@/interfaces/certificate';
import { APIName } from '@/constants/api_connection';
import { IFile } from '@/interfaces/file';
import APIHandler from '@/lib/utils/api_handler';
import { UploadType } from '@/constants/file';
import useStateRef from 'react-usestateref';
import { ProgressStatus } from '@/constants/account';

interface IFileWithUrl extends File {
  file: File;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  url: string;
}

const MobileUploadPage: React.FC = () => {
  const router = useRouter();
  const { query } = router;
  const [token, setToken] = useState<string | undefined>(undefined);
  const [selectedCertificates, setSelectedCertificates, selectedCertificatesRef] = useStateRef<
    IFileWithUrl[]
  >([]);
  const [uploadedCertificates, setUploadedCertificates] = useState<ICertificateInfo[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const { trigger: uploadFileAPI } = APIHandler<IFile[]>(APIName.PUBLIC_FILE_UPLOAD);
  const { trigger: pusherAPI } = APIHandler<void>(APIName.PUSHER);

  useEffect(() => {
    if (router.isReady && query.token) {
      setToken(query.token as string);
    }
  }, [router.isReady, query.token]);

  const handleCertificateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const certificates = Array.from(e.target.files).map(
        (file) =>
          ({
            file, // Info: (20241009 - tzuhan) Store the original File object for FormData
            name: file.name, // Info: (20241009 - tzuhan)  File metadata
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            url: URL.createObjectURL(file), // Info: (20241009 - tzuhan)  For displaying the image preview
          }) as IFileWithUrl
      );
      setSelectedCertificates(certificates);
    }
  };

  const uploadCertificates = async () => {
    setIsUploading(true);

    try {
      // Info: (20241007 - tzuhan) Step 1: Push initial certificate info via Pusher
      const certificatesPayload = selectedCertificatesRef.current.map(
        (obj, index) =>
          ({
            id: uploadedCertificates.length + index,
            name: obj.name,
            size: obj.size,
            url: obj.url,
            status: ProgressStatus.IN_PROGRESS,
            progress: 0,
          }) as ICertificateInfo
      );

      // Deprecated: (20241011-tzuhan) Debugging purpose
      // eslint-disable-next-line no-console
      console.log('certificatesPayload:', certificatesPayload);

      const { success: successPush } = await pusherAPI({
        body: {
          token: token as string,
          certificates: certificatesPayload,
        },
      });

      if (successPush === false) {
        throw new Error('Failed to send initial certificates via Pusher');
      }

      // Info: (20241008 - tzuhan) Step 2: Use FormData to upload files
      const formData = new FormData();
      selectedCertificates.forEach((certificate) => {
        formData.append('file', certificate.file); // Info: (20241009 - tzuhan) Use the original File object
      });

      const { success } = await uploadFileAPI({
        query: {
          type: UploadType.MOBILE_UPLOAD,
          token: token as string,
        },
        body: formData,
      });

      if (success === false) {
        throw new Error('Failed to upload certificates');
      }

      // Info: (20241008 - tzuhan) Step 3: Update certificates progress and push again
      const uploadingCertificates = selectedCertificatesRef.current.map(
        (obj, index) =>
          ({
            id: uploadedCertificates.length + index,
            name: obj.name,
            size: obj.size,
            url: obj.url, // Info: (20241008 - tzuhan) Use original URL here
            status: ProgressStatus.SUCCESS,
            progress: 100, // Info: (20241008 - tzuhan) Placeholder progress
          }) as ICertificateInfo
      );

      const { success: successPushAgain } = await pusherAPI({
        body: {
          token: token as string,
          certificates: uploadingCertificates,
        },
      });

      if (successPushAgain === false) {
        // Deprecated: (20241011 - tzuhan) Debugging purpose
        // eslint-disable-next-line no-console
        console.error('Failed to send certificates update via Pusher');
      } else {
        setSelectedCertificates([]);
        setUploadedCertificates((prev) => [...prev, ...uploadingCertificates]);
      }
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
          disabled={isUploading || selectedCertificates.length === 0 || !token}
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
              <div key={`uploaded_certificate_${index + 1}`}>
                {certificate.status !== ProgressStatus.FAILED ? (
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

export const getStaticProps = async ({ locale }: ILocale) => ({
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

export default MobileUploadPage;
