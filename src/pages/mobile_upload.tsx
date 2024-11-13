import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { IFileUIBeta } from '@/interfaces/file';
import { APIName } from '@/constants/api_connection';
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
import { PiHouse } from 'react-icons/pi';
import { ToastId } from '@/constants/toast_id';
import { ToastType } from '@/interfaces/toastify';
import { CERTIFICATE_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';

export interface IFileUIBetaWithFile extends IFileUIBeta {
  file: File;
}

const MobileUploadPage: React.FC = () => {
  const { t } = useTranslation(['certificate', 'common']);
  const router = useRouter();
  const { query } = router;
  const [token, setToken] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedCertificates, setSelectedCertificates, selectedCertificatesRef] = useStateRef<
    IFileUIBetaWithFile[]
  >([]);
  const [uploadedCertificates, setUploadedCertificates] = useState<IFileUIBeta[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [successUpload, setSuccessUpload] = useState<boolean>(false);
  // Info: (20241023 - tzuhan) @Murky, <...> 裡面是 public file upload API 期望的回傳格式，希望回傳 fileId
  const { trigger: uploadFileAPI } = APIHandler<number>(APIName.PUBLIC_FILE_UPLOAD);
  const { trigger: pusherAPI } = APIHandler<void>(APIName.PUSHER);
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();
  const [selectedCertificate, setSelectedCertificate] = useState<IFileUIBetaWithFile | null>(null);

  const handleCertificateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        // .filter((file) => !selectedCertificatesRef.current.some((f) => f.name === file.name));
        setSelectedCertificates((prev) => [...prev, ...certificates]);
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
    if (selectedCertificate && selectedCertificate.name === file.name) {
      setSelectedCertificate(null);
    }
    setSelectedCertificates(selectedCertificates.filter((f) => f.name !== file.name));
    URL.revokeObjectURL(file.url);
  };

  const uploadCertificates = async () => {
    setIsUploading(true);
    try {
      const certificatesPayload = [...selectedCertificatesRef.current];

      if (!token) {
        toastHandler({
          id: ToastId.TOKEN_NOT_PROVIDED,
          type: ToastType.ERROR,
          content: t('certificate:ERROR.TOKEN_NOT_PROVIDED'),
          closeable: true,
        });
        return;
      }

      const { success: successPush } = await pusherAPI({
        query: {
          channel: PRIVATE_CHANNEL.CERTIFICATE,
          event: CERTIFICATE_EVENT.UPLOAD,
        },
        body: {
          token: token as string,
          files: certificatesPayload,
        },
      });

      if (successPush === false) {
        toastHandler({
          id: ToastId.NOTIFY_WEB_ERROR,
          type: ToastType.WARNING,
          content: t('certificate:ERROR.NOTIFY_WEB'),
          closeable: true,
        });
      }

      selectedCertificates.map(async (certificate) => {
        const formData = new FormData();
        formData.append('file', certificate.file);

        const { success, data: filedId } = await uploadFileAPI({
          query: {
            type: UploadType.ROOM,
            token: token as string,
          },
          body: formData,
        });

        const uploadingCertificate = {
          ...certificate,
        };

        if (success && filedId) {
          uploadingCertificate.id = filedId;
          uploadingCertificate.status = ProgressStatus.SUCCESS;
          uploadingCertificate.progress = 100;
        } else {
          uploadingCertificate.status = ProgressStatus.FAILED;
          uploadingCertificate.progress = 0;
        }

        const { success: successPushAgain } = await pusherAPI({
          query: {
            channel: PRIVATE_CHANNEL.CERTIFICATE,
          },
          body: {
            token: token as string,
            files: [uploadingCertificate],
          },
        });

        if (successPushAgain === false) {
          if (success) {
            toastHandler({
              id: ToastId.NOTIFY_WEB_ERROR,
              type: ToastType.WARNING,
              content: t('certificate:WARNING.SUCCESS_UPLOAD_BUT_NOTIFY_ERROR', {
                name: certificate.name,
              }),
              closeable: true,
            });
          } else {
            toastHandler({
              id: ToastId.UPLOAD_CERTIFICATE_ERROR,
              type: ToastType.ERROR,
              content: t('certificate:ERROR.UPLOAD_AND_NOTIFY', { name: certificate.name }),
              closeable: true,
            });
          }
        }
        setUploadedCertificates((prev) => [...prev, uploadingCertificate]);
      });
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

  const handleSelectCertificate = (certificate: IFileUIBetaWithFile) => {
    if (selectedCertificate && selectedCertificate.name === certificate.name) {
      setSelectedCertificate(null);
      return;
    }
    setSelectedCertificate(certificate);
  };

  const handleBack = () => {
    setIsUploading(false);
    setSelectedCertificates([]);
    setUploadedCertificates([]);
  };

  useEffect(() => {
    clearAllItems();
    if (router.isReady && query.token) {
      setToken(query.token as string);
    }
  }, [router]);

  useEffect(() => {
    if (
      selectedCertificates.length === uploadedCertificates.length &&
      selectedCertificates.length > 0
    ) {
      setTimeout(() => {
        setSuccessUpload(true);
      }, 1000);
    }
  }, [uploadedCertificates, selectedCertificates]);

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
              {selectedCertificates.length}
            </div>
          </div>
          <Button
            id="camera-upload-image-button"
            type="button"
            variant="default"
            onClick={uploadCertificates}
            className={`mr-1 rounded-xs p-3`}
            disabled={!token || selectedCertificates.length === 0}
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
        {isUploading && (
          <div className="full-height safe-area-adjustment absolute left-0 top-0 z-20 flex h-100vh w-100vw items-center justify-center bg-white">
            {!successUpload ? (
              <div className="flex flex-col items-center gap-2">
                <Image
                  src="/elements/uploading.gif"
                  className="rounded-xs"
                  width={150}
                  height={150}
                  alt="Uploading..."
                />
                <div>Uploading...</div>
                <div className="text-sm text-text-neutral-tertiary">
                  ({`${uploadedCertificates.length}/${selectedCertificates.length}`})
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
                  <div>Compeleted</div>
                </div>
                <Button
                  type="button"
                  variant="default"
                  onClick={handleBack}
                  className="mx-4 mb-4 flex items-center gap-2"
                >
                  <PiHouse size={20} />
                  <div>Back</div>
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
