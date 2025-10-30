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
import { FiTrash2, FiUpload } from 'react-icons/fi';
import { FaPlus } from 'react-icons/fa6';
import { useModalContext } from '@/contexts/modal_context';
import { MessageType } from '@/interfaces/message_modal';
import { PiHouse } from 'react-icons/pi';
import { ToastId } from '@/constants/toast_id';
import { ToastType } from '@/interfaces/toastify';
import { encryptFileWithPublicKey, importPublicKey } from '@/lib/utils/crypto';
import { compressImageToTargetSize } from '@/lib/utils/image_compress';
import { RxCross1 } from 'react-icons/rx';

export interface IFileUIBetaWithFile extends IFileUIBeta {
  file: File;
  width?: number;
  height?: number;
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
  const [successUpload, setSuccessUpload] = useState<boolean | undefined>(undefined);
  const { trigger: uploadFileAPI } = APIHandler<number>(APIName.FILE_UPLOAD);
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();
  const [publicKey, setPublicKey] = useState<CryptoKey | null>(null);
  const { trigger: fetchPublicKey } = APIHandler<JsonWebKey>(APIName.ROOM_GET_PUBLIC_KEY_BY_ID);

  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (e.target.files) {
        const targetSize = 1 * 1024 * 1024; // Info: (20241206 - tzuhan) 1MB
        const files = Array.from(e.target.files);
        const compressedFiles = await Promise.all(
          files.map((file) => compressImageToTargetSize(file, targetSize))
        );
        const certificates = compressedFiles.map(
          ({ file, previewUrl }) =>
            ({
              id: null,
              name: file.name,
              size: file.size,
              url: previewUrl,
              progress: 0,
              status: ProgressStatus.IN_PROGRESS,
              file, // Info: (20241009 - tzuhan) 這裡是將壓縮後的圖片放入 file
            }) as IFileUIBetaWithFile
        );
        // Deprecated: (20241019 - tzuhan) 如果是拍照模式使用下列code就只能拍一張照片
        // .filter((file) => !selectedFilesRef.current.some((f) => f.name === file.name));
        setSelectedFiles((prev) => [...prev, ...certificates]);
      }
    } catch (error) {
      messageModalDataHandler({
        title: t('certificate:ERROR.SELECT_CERTIFICATE'),
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

  const encryptFileWithKey = async (file: File) => {
    if (!token) throw new Error(t('certificate:ERROR.TOKEN_NOT_PROVIDED'));
    try {
      let key = publicKey;
      if (!key) {
        const { success, data } = await fetchPublicKey({
          params: { roomId: token },
        });
        if (!success || !data) {
          throw new Error(t('certificate:UPLOAD.FAILED'));
        }
        const cryptokey = await importPublicKey(data);
        setPublicKey(cryptokey);
        key = cryptokey;
      }
      const { encryptedFile, iv, encryptedSymmetricKey } = await encryptFileWithPublicKey(
        file,
        key
      );
      const formData = new FormData();
      formData.append('file', encryptedFile);
      formData.append('encryptedSymmetricKey', encryptedSymmetricKey);
      formData.append('publicKey', JSON.stringify(key));
      formData.append('iv', Array.from(iv).join(','));
      return formData;
    } catch (error) {
      (error as Error).message += ' - encryptFileWithKey failed';
      throw error;
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
          const formData = await encryptFileWithKey(fileUI.file);
          const { success, data: fileId } = await uploadFileAPI({
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

      setSuccessUpload(true);
    } catch (error) {
      setSuccessUpload(false);
      setIsUploading(false);
      messageModalDataHandler({
        title: t('certificate:ERROR.UPLOAD_CERTIFICATE'),
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
        // Info: (20241120 - tzuhan) 這裡的高度是為了讓底部的按鈕不會被遮住
        // eslint-disable-next-line tailwindcss/no-arbitrary-value
        className="full-height safe-area-adjustment grid h-screen grid-rows-[100px_1fr_105px] overflow-hidden"
      >
        {selectedFile && (
          <section className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
            <div className="relative flex max-h-90vh max-w-90vw flex-col gap-5 rounded-lg bg-surface-neutral-surface-lv2 px-6 py-5">
              <button
                type="button"
                className="absolute right-6 top-5 text-checkbox-text-primary"
                onClick={() => setSelectedFile(null)}
              >
                <RxCross1 size={24} />
              </button>
              <h2 className="flex flex-col items-center justify-center gap-2 text-xl font-semibold text-card-text-title">
                <div className="text-xl font-semibold">
                  {t('certificate:UPLOAD.INDEX', {
                    index: selectedFiles.indexOf(selectedFile),
                  })}
                </div>
                <div className="text-xs font-normal text-card-text-sub">
                  {t('certificate:UPLOAD.PREVIEW')}
                </div>
              </h2>

              <div className="hide-scrollbar relative flex max-h-70vh w-full flex-1 items-center justify-center overflow-scroll sm:max-h-60vh lg:max-h-75vh">
                <div className="relative h-auto w-full">
                  <Image
                    src={selectedFile.url}
                    alt={selectedFile.name}
                    layout="responsive"
                    width={400}
                    height={600}
                    objectFit="contain"
                    className="rounded-md"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="tertiaryOutline"
                className="px-4 py-2"
                onClick={() => handleRemoveFile(selectedFile)}
              >
                <FiTrash2 size={22} />
                <div>{t('certificate:UPLOAD.DELETE')}</div>
              </Button>
            </div>
          </section>
        )}
        <div className="flex h-100px shrink-0 items-center justify-between bg-surface-neutral-solid-dark p-2">
          <div className="ml-1 w-44px"></div>
          <div className="flex items-center justify-center gap-2">
            <div className="p-2 text-stroke-neutral-invert">{t('certificate:TITLE.SELECT')}:</div>
            <div className="h-22px w-22px rounded-full bg-badge-surface-soft-primary text-center text-sm font-normal tracking-tight text-badge-text-primary-solid">
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
        <div className="grid auto-rows-min-content grid-cols-3 gap-2.5 overflow-y-auto px-2.5 py-3 sm:grid-cols-dynamic-fill">
          <div className="group">
            <button
              id="camera-upload-image-button"
              type="button"
              className="flex w-full items-center justify-center rounded-xs border border-dashed border-stroke-brand-primary text-white group-hover:border-stroke-brand-primary"
              onClick={handleModeUpload}
              style={{ aspectRatio: '1 / 1' }}
            >
              <FaPlus
                className="text-stroke-brand-primary group-hover:text-stroke-brand-primary"
                size={24}
              />
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                ref={inputRef}
                onChange={handleFilesSelect}
              />
            </button>
          </div>
          {selectedFiles.map((file) => (
            <div key={file.name} className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
              <Image
                src={file.url}
                alt={file.name}
                layout="fill"
                objectFit="cover"
                className="rounded-xs"
                onClick={() => handleSelectFile(file)}
              />
              <div className="absolute bottom-1 right-1 rounded-full bg-surface-neutral-solid-dark p-1.5 text-surface-neutral-solid-light opacity-50">
                <FiTrash2 size={22} onClick={() => handleRemoveFile(file)} />
              </div>
            </div>
          ))}
        </div>
        {isUploading && (
          <div className="full-height safe-area-adjustment absolute left-0 top-0 z-20 flex h-100vh w-100vw items-center justify-center bg-white">
            {successUpload === undefined ? (
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
                  {successUpload === false && (
                    <div className="text-sm text-text-neutral-tertiary">
                      ({`${uploadedFiles.length}/${selectedFiles.length}`})
                    </div>
                  )}
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
