// Deprecated: (20241120 - tzuhan) Debugging purpose
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import Image from 'next/image';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { IFileUIBeta } from '@/interfaces/file';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { UploadType } from '@/constants/file';
import { ProgressStatus } from '@/constants/account';
import { clearAllItems } from '@/lib/utils/indexed_db/ocr';
import { Button } from '@/components/button/button';
import { FiUpload } from 'react-icons/fi';
import { ImFilePicture } from 'react-icons/im';
import { FaPlus } from 'react-icons/fa6';
import { useModalContext } from '@/contexts/modal_context';
import { MessageType } from '@/interfaces/message_modal';
import { RxCross2 } from 'react-icons/rx';
import { RiExpandDiagonalLine } from 'react-icons/ri';
import { PiHouse } from 'react-icons/pi';
import { ToastId } from '@/constants/toast_id';
import { ToastType } from '@/interfaces/toastify';
import { encryptFile, importPublicKey } from '@/lib/utils/crypto';
import { IV_LENGTH } from '@/constants/config';

export interface IFileUIBetaWithFile extends IFileUIBeta {
  file: File;
}

const MobileUploadPage: React.FC = () => {
  const { t } = useTranslation(['certificate', 'common']);
  const router = useRouter();
  const { query } = router;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [token, setToken] = useState<string | undefined>(undefined);
  const [selectedFile, setSelectedFile] = useState<IFileUIBetaWithFile | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<IFileUIBetaWithFile[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<IFileUIBeta[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [successUpload, setSuccessUpload] = useState<boolean>(false);
  const { trigger: fetchPublicKey } = APIHandler<JsonWebKey>(APIName.PUBLIC_KEY_GET);
  const { trigger: uploadFileAPI } = APIHandler<number>(APIName.FILE_UPLOAD);
  // Deprecated: (20241120 - tzuhan) Test upload file to server then server push notification
  const { trigger: publicUploadAPI } = APIHandler<number>(APIName.PUBLIC_FILE_UPLOAD);
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (e.target.files) {
        const certificates = Array.from(e.target.files).map(
          (file) =>
            ({
              id: null,
              name: file.name, // Info: (20241009 - tzuhan)  File metadata
              size: file.size,
              url: URL.createObjectURL(file), // Info: (20241009 - tzuhan)  For displaying the image preview
              progress: 0,
              status: ProgressStatus.IN_PROGRESS,
              file, // Info: (20241009 - tzuhan) Store the original File object for FormData
            }) as IFileUIBetaWithFile
        );
        // Deprecated: (20241019 - tzuhan) 如果是拍照模式使用下列code就只能拍一張照片
        // .filter((file) => !selectedFilesRef.current.some((f) => f.name === file.name));
        setSelectedFiles((prev) => [...prev, ...certificates]);
      }
    } catch (error) {
      messageModalDataHandler({
        title: t('certificate:ERROR.SELECT_CERTIFICATE'), // ToDo: (20241015 - Tzuhan) i18n
        content: `${error ? (error as Error).message : t('certificate:ERROR.WENT_WRONG')}`,
        messageType: MessageType.ERROR,
        submitBtnStr: t('common:COMMON.CLOSE'),
        submitBtnFunction: () => {
          messageModalVisibilityHandler();
        },
      });
      messageModalVisibilityHandler();
    }
  };

  const handleRemoveFile = (file: IFileUIBetaWithFile) => {
    if (selectedFile && selectedFile.name === file.name) {
      setSelectedFile(null);
    }
    setSelectedFiles(selectedFiles.filter((f) => f.name !== file.name));
    URL.revokeObjectURL(file.url);
  };

  const encryptFileWithPublicKey = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { success, data: publicKey } = await fetchPublicKey({
        params: {
          token,
        },
      });
      if (success && publicKey) {
        const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        const { encryptedContent } = await encryptFile(
          arrayBuffer,
          await importPublicKey(publicKey),
          iv
        );
        const encryptedFile = new File([encryptedContent], file.name, {
          type: file.type,
        });

        return encryptedFile;
      } else {
        throw new Error('faile to get publicKey'); // ToDo: (20241120 - tuzhan) 轉成i18n
      }
    } catch (error) {
      throw new Error('faile to encrypt file'); // ToDo: (20241120 - tuzhan) 轉成i18n
    }
  };

  const uploadFiles = async () => {
    setIsUploading(true);
    try {
      if (!token) {
        toastHandler({
          id: ToastId.TOKEN_NOT_PROVIDED,
          type: ToastType.ERROR,
          content: t('certificate:ERROR.TOKEN_NOT_PROVIDED'),
          closeable: true,
        });
        return;
      }
      await Promise.all(
        selectedFiles.map(async (fileUI) => {
          // const encryptedFile = await encryptFileWithPublicKey(fileUI.file);
          const formData = new FormData();
          // formData.append('file', encryptedFile);
          formData.append('file', fileUI.file);

          // const { success, data: filedId } = await uploadFileAPI({
          //   query: {
          //     type: UploadType.ROOM,
          //     targetId: token as string,
          //   },
          //   body: formData,
          // });

          const { success, data: fileId } = await publicUploadAPI({
            query: {
              type: UploadType.ROOM,
              targetId: token as string,
            },
            body: formData,
          });

          setUploadedFiles((prev) => [
            ...prev,
            {
              ...fileUI,
              id: success ? fileId : null,
              progress: success ? 100 : 0,
              status: success ? ProgressStatus.SUCCESS : ProgressStatus.FAILED,
            },
          ]);
        })
      );

      setIsUploading(false);
      setSuccessUpload(true);
    } catch (error) {
      setSuccessUpload(false);
      setIsUploading(false);
      messageModalDataHandler({
        title: t('certificate:ERROR.UPLOAD_CERTIFICATE'), // ToDo: (20241015 - Tzuhan) i18n
        content: `${error ? (error as Error).message : t('certificate:ERROR.WENT_WRONG')}`,
        messageType: MessageType.ERROR,
        submitBtnStr: t('common:COMMON.CLOSE'),
        submitBtnFunction: () => {
          messageModalVisibilityHandler();
        },
      });
      messageModalVisibilityHandler();
    }
  };

  const handleModeUpload = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleSelectFile = (file: IFileUIBetaWithFile) => {
    if (selectedFile && selectedFile.name === file.name) {
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleBack = () => {
    setIsUploading(false);
    setSelectedFiles([]);
    setUploadedFiles([]);
  };

  useEffect(() => {
    clearAllItems();
    if (router.isReady && query.token) {
      setToken(query.token as string);
    }
  }, [router]);

  useEffect(() => {
    if (selectedFiles.length === uploadedFiles.length && selectedFiles.length > 0) {
      setTimeout(() => {
        setSuccessUpload(true);
      }, 1000);
    }
  }, [uploadedFiles, selectedFiles]);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('certificate:TITLE.UPLOAD')} - iSunFA</title>
      </Head>
      <main
        // Deprecated: (20241019 - tzuhan) Debugging purpose
        // eslint-disable-next-line tailwindcss/no-arbitrary-value
        className="full-height safe-area-adjustment grid h-screen grid-rows-[100px_1fr_105px] overflow-hidden"
      >
        <div className="flex h-100px shrink-0 items-center justify-between bg-surface-neutral-solid-dark p-2">
          <div className="ml-1 w-44px"></div>
          <div className="flex items-center justify-center gap-2">
            <div className="p-2 text-stroke-neutral-invert">{t('certificate:TITLE.SELECT')}:</div>
            <div className="rounded-full bg-badge-surface-soft-primary px-4px py-2px text-xs tracking-tight text-badge-text-primary-solid">
              {selectedFiles.length}
            </div>
          </div>
          <Button
            id="camera-upload-image-button"
            type="button"
            variant="default"
            onClick={uploadFiles}
            className={`mr-1 rounded-xs p-3`}
            disabled={!token || selectedFiles.length === 0}
          >
            <FiUpload size={20} className="leading-none text-button-text-secondary" />
          </Button>
        </div>

        {selectedFile ? (
          <div className="mx-auto h-full w-full">
            <Image
              src={selectedFile.url}
              alt={selectedFile.name}
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
            {selectedFiles.map((file) => (
              <div
                key={file.name}
                className="relative w-full"
                style={{ aspectRatio: '1 / 1' }}
                onClick={() => handleSelectFile(file)}
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
            {selectedFiles.map((file) => (
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
                  className={`absolute left-0 top-0 h-50px w-50px ${selectedFile && selectedFile.url === file.url ? 'bg-black/50' : 'bg-transparent'}`}
                  onClick={() => handleSelectFile(file)}
                ></div>
                <button
                  type="button"
                  className="absolute -right-8px top-0 h-16px w-16px -translate-y-1/2 rounded-full border border-stroke-neutral-solid-dark bg-surface-neutral-surface-lv2 p-0 text-stroke-neutral-solid-dark"
                  onClick={() => handleRemoveFile(file)}
                >
                  <RxCross2 size={10} className="mx-auto" />
                </button>
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
              onChange={handleFilesSelect}
            />
          </Button>
        </div>
        {isUploading && (
          <div className="full-height safe-area-adjustment absolute left-0 top-0 z-20 flex h-100vh w-100vw items-center justify-center bg-white">
            {!successUpload ? (
              <div className="flex flex-col items-center gap-2">
                <Image
                  src="/elements/uploading.gif"
                  className="rounded-xs"
                  width={150}
                  height={150}
                  alt={t('certificate:UPLOAD.LOADING')}
                />
                <div>{t('certificate:UPLOAD.LOADING')}</div>
                <div className="text-sm text-text-neutral-tertiary">
                  ({`${uploadedFiles.length}/${selectedFiles.length}`})
                </div>
              </div>
            ) : (
              <div className="flex h-full w-full flex-col justify-center">
                <div className="flex flex-1 flex-col items-center justify-center gap-2">
                  <Image
                    src="/elements/upload_success.gif"
                    className="rounded-xs"
                    width={150}
                    height={150}
                    alt="Success"
                  />
                  <div>{t('certificate:UPLOAD.COMPLETED')}</div>
                </div>
                <Button
                  type="button"
                  variant="default"
                  onClick={handleBack}
                  className="mx-4 mb-4 flex items-center gap-2"
                >
                  <PiHouse size={20} />
                  <div>{t('certificate:UPLOAD.BACK')}</div>
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'certificate'])),
    locale,
  },
});

export const getStaticProps = getStaticPropsFunction;

export default MobileUploadPage;
