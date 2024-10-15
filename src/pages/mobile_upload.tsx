import { useRouter } from 'next/router';
import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
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
import { Button } from '@/components/button/button';
import Image from 'next/image';
import { FiUpload } from 'react-icons/fi';
import { ImFilePicture } from 'react-icons/im';
import { FaPlus } from 'react-icons/fa6';
import { useModalContext } from '@/contexts/modal_context';
import { MessageType } from '@/interfaces/message_modal';
import { RxCross2 } from 'react-icons/rx';
import { RiExpandDiagonalLine } from 'react-icons/ri';

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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedCertificates, setSelectedCertificates, selectedCertificatesRef] = useStateRef<
    IFileWithUrl[]
  >([]);
  const [uploadedCertificates, setUploadedCertificates] = useState<ICertificateInfo[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const { trigger: uploadFileAPI } = APIHandler<IFile[]>(APIName.PUBLIC_FILE_UPLOAD);
  const { trigger: pusherAPI } = APIHandler<void>(APIName.PUSHER);
  const { messageModalDataHandler, messageModalVisibilityHandler } = useModalContext();
  const [selectedCertificate, setSelectedCertificate] = useState<IFileWithUrl | null>(null);

  const handleCertificateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
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
        // Deprecated: (20241019 - tzuhan) 如果是拍照模式使用下列code就只能拍一張照片
        // .filter((file) => !selectedCertificatesRef.current.some((f) => f.name === file.name));
        setSelectedCertificates((prev) => [...prev, ...certificates]);
      }
    } catch (error) {
      messageModalDataHandler({
        title: 'Select File Error', // ToDo: (20240823 - Julian) i18n
        content: `${error ? (error as Error).message : 'Something went wrong'}`,
        messageType: MessageType.ERROR,
        submitBtnStr: 'Close',
        submitBtnFunction: () => {
          messageModalVisibilityHandler();
        },
      });
      messageModalVisibilityHandler();
    }
  };

  const handleRemoveFile = (file: IFileWithUrl) => {
    if (selectedCertificate && selectedCertificate.name === file.name) {
      setSelectedCertificate(null);
    }
    setSelectedCertificates(selectedCertificates.filter((f) => f.name !== file.name));
    URL.revokeObjectURL(file.url);
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

  const handleModeUpload = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleSelectCertificate = (certificate: IFileWithUrl) => {
    if (selectedCertificate && selectedCertificate.name === certificate.name) {
      setSelectedCertificate(null);
      return;
    }
    setSelectedCertificate(certificate);
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
        className="full-height safe-area-adjustment grid h-screen grid-rows-[100px_1fr_105px] overflow-hidden"
      >
        <div className="flex h-100px shrink-0 items-center justify-between bg-surface-neutral-solid-dark p-2">
          <div className="ml-1 w-44px"></div>
          <div className="p-2 text-stroke-neutral-invert">
            Selected file: {selectedCertificates.length}
          </div>
          <Button
            id="camera-upload-image-button"
            type="button"
            variant="default"
            onClick={uploadCertificates}
            className={`mr-1 rounded-xs p-3`}
            disabled={isUploading || selectedCertificates.length === 0}
          >
            <FiUpload size={20} className="leading-none text-button-text-secondary" />
          </Button>
        </div>

        {selectedCertificate ? (
          <div className="mx-auto h-full w-full">
            <Image
              src={selectedCertificate.url}
              alt={selectedCertificate.name}
              layout="fill"
              objectFit="contain"
            />
          </div>
        ) : (
          <div className="grid auto-rows-min-content grid-cols-3 gap-1 overflow-y-auto px-1 sm:grid-cols-dynamic-fill">
            <div className="group">
              <button
                id="camera-upload-image-button"
                type="button"
                className="flex w-full items-center justify-center rounded-xs border border-dashed border-stroke-neutral-tertiary text-white group-hover:border-stroke-brand-primary"
                onClick={handleModeUpload}
                style={{ aspectRatio: '1 / 1' }}
              >
                <FaPlus
                  className="text-stroke-neutral-tertiary group-hover:text-stroke-brand-primary"
                  size={24}
                />
              </button>
            </div>
            {selectedCertificates.map((file) => (
              <div
                key={file.name}
                className="relative w-full"
                style={{ aspectRatio: '1 / 1' }}
                onClick={() => handleSelectCertificate(file)}
              >
                <Image
                  src={file.url}
                  alt={file.name}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-xs"
                />
                <div className="absolute bottom-0 right-0 rounded-full bg-surface-neutral-solid-dark p-1 text-surface-neutral-solid-light opacity-50">
                  <RiExpandDiagonalLine size={12} />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="z-10 flex h-105px shrink-0 items-center justify-between overflow-x-hidden rounded-t-lg bg-surface-neutral-solid-dark p-2">
          <div className="flex h-full w-full items-center gap-2 overflow-x-auto">
            {selectedCertificates.map((file) => (
              <div
                key={file.name}
                className="relative w-full"
                style={{ aspectRatio: '1 / 1', width: '50px', minWidth: '50px' }}
              >
                <Image
                  src={file.url}
                  alt={file.name}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-xs"
                />
                <div
                  className={`absolute left-0 top-0 h-50px w-50px ${selectedCertificate && selectedCertificate.url === file.url ? 'bg-black/50' : 'bg-transparent'}`}
                  onClick={() => handleSelectCertificate(file)}
                ></div>
                <Button
                  type="button"
                  variant={null}
                  className="absolute -right-8px top-0 h-16px w-16px -translate-y-1/2 rounded-full border border-stroke-neutral-solid-dark bg-surface-neutral-surface-lv2 p-0 text-stroke-neutral-solid-dark"
                  onClick={() => handleRemoveFile(file)}
                >
                  <RxCross2 size={10} />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant={null}
            onClick={handleModeUpload}
            className="ml-2 w-44px p-0 text-stroke-neutral-invert"
          >
            <ImFilePicture size={40} />
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              ref={inputRef}
              onChange={handleCertificateChange}
            />
          </Button>
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

export default MobileUploadPage;
