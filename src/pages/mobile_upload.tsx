import { useRouter } from 'next/router';
import Head from 'next/head';
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
import { clearAllItems } from '@/lib/utils/indexed_db/ocr';
import CameraWithFrame, {
  IFileWithUrl,
  UploadMode,
} from '@/components/mobile_upload/camera_with_frame';
import PhotoGrid from '@/components/mobile_upload/photo_grid';

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
  const [uploadMode, setUploadMode] = useState<UploadMode>(UploadMode.CAMERA);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const certificates = Array.from(e.target.files).map(
        (file) =>
          ({
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            url: URL.createObjectURL(file),
          }) as IFileWithUrl
      );
      setSelectedCertificates(certificates);
    }
  };

  const handleRemoveFile = (file: IFileWithUrl) => {
    setSelectedCertificates(selectedCertificates.filter((f) => f !== file));
  };

  const handleCapture = (file: File) => {
    const newFile = {
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      url: URL.createObjectURL(file),
    } as IFileWithUrl;

    setSelectedCertificates((prev) => [...prev, newFile]);
  };

  const uploadCertificates = async () => {
    setIsUploading(true);
    try {
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

      const { success: successPush } = await pusherAPI({
        body: {
          token: token as string,
          certificates: certificatesPayload,
        },
      });

      if (successPush === false) {
        throw new Error('Failed to send initial certificates via Pusher');
      }

      const formData = new FormData();
      selectedCertificates.forEach((certificate) => {
        formData.append('file', certificate.file);
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

      const uploadingCertificates = selectedCertificatesRef.current.map(
        (obj, index) =>
          ({
            id: uploadedCertificates.length + index,
            name: obj.name,
            size: obj.size,
            url: obj.url,
            status: ProgressStatus.SUCCESS,
            progress: 100,
          }) as ICertificateInfo
      );

      const { success: successPushAgain } = await pusherAPI({
        body: {
          token: token as string,
          certificates: uploadingCertificates,
        },
      });

      if (successPushAgain === false) {
        // Deprecated: (20241019 - tzuhan) Debugging purpose
        // eslint-disable-next-line no-console
        console.error('Failed to send certificates update via Pusher');
      } else {
        setSelectedCertificates([]);
        setUploadedCertificates((prev) => [...prev, ...uploadingCertificates]);
      }
    } catch (error) {
      // Deprecated: (20241019 - tzuhan) Debugging purpose
      // eslint-disable-next-line no-console
      console.error('Error uploading certificates:', error);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    clearAllItems();
    if (router.isReady && query.token) {
      setToken(query.token as string);
    }
  }, []);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>Upload Certificate - iSunFA</title>
      </Head>
      <main
        // Deprecated: (20241019 - tzuhan) Debugging purpose
        // eslint-disable-next-line tailwindcss/no-arbitrary-value
        className="full-height safe-area-adjustment grid h-screen grid-rows-[100px_1fr_85px]"
      >
        {uploadMode === UploadMode.CAMERA ? (
          <CameraWithFrame
            onCapture={handleCapture}
            selectedCertificates={selectedCertificates}
            onUpload={uploadCertificates}
            isUploading={isUploading}
            setUploadMode={setUploadMode}
            onFileChange={handleFileChange}
          />
        ) : (
          <PhotoGrid
            selectedCertificates={selectedCertificates}
            onRemove={handleRemoveFile}
            setUploadMode={setUploadMode}
          />
        )}
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

export default MobileUploadPage;
