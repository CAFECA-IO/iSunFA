import { useRouter } from 'next/router';
import { Button } from '@/components/button/button';
import Head from 'next/head';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { ICertificateInfo } from '@/interfaces/certificate';
import { APIName } from '@/constants/api_connection';
import { IFile } from '@/interfaces/file';
import APIHandler from '@/lib/utils/api_handler';
import { UploadType } from '@/constants/file';
import useStateRef from 'react-usestateref';
import { ProgressStatus } from '@/constants/account';
import { FiUpload } from 'react-icons/fi';
import { MdArrowBack } from 'react-icons/md';
import { useModalContext } from '@/contexts/modal_context';
import { MessageType } from '@/interfaces/message_modal';
import { RxCamera } from 'react-icons/rx';

enum UploadMode {
  CAMERA = 'CAMERA',
  ALBUM = 'ALBUM',
}

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null); // 存儲相機流
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { messageModalDataHandler, messageModalVisibilityHandler } = useModalContext();
  const [uploadMode, setUploadMode] = useState<UploadMode>(UploadMode.CAMERA);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(true);
  const [flashEnabled, setFlashEnabled] = useState<boolean>(false);

  const adjustFrameSize = () => {
    const aspectRatio = 1.54;
    let frameWidth = 0;
    let frameHeight = 0;
    if (window.innerWidth > window.innerHeight) {
      frameHeight = (window.innerHeight - 200) * 0.7;
      frameWidth = frameHeight / aspectRatio;
    } else {
      frameWidth = window.innerWidth * 0.7;
      frameHeight = frameWidth * aspectRatio;
    }
    const frameElement = document.getElementById('alignment-frame');
    if (frameElement) {
      frameElement.style.width = `${frameWidth}px`;
      frameElement.style.height = `${frameHeight}px`;
    }
    if (videoRef.current) {
      videoRef.current.width = frameWidth;
      videoRef.current.height = frameHeight;
    }
  };

  const handleCertificateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const startCamera = async () => {
    try {
      if (videoRef.current && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: flashEnabled ? 'user' : 'environment' },
          audio: false,
        });
        videoRef.current.srcObject = stream;
        setCameraStream(stream);
      }
    } catch (error) {
      // Deprecated: (20241019 - tzuhan) Debugging purpose
      // eslint-disable-next-line no-console
      console.error(`startCamera error:`, error);

      messageModalDataHandler({
        title: 'Camera Error', // ToDo: (20240823 - Julian) i18n
        content: '相機不支援此裝置或瀏覽器。',
        messageType: MessageType.ERROR,
        submitBtnStr: 'Close',
        submitBtnFunction: () => {
          messageModalVisibilityHandler();
          setIsCameraOpen(false);
        },
      });
      messageModalVisibilityHandler();
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      // 停止所有相機的流
      cameraStream.getTracks().forEach((track) => {
        track.stop();
      });
      setCameraStream(null);
    }
  };

  const dataURLtoFile = (dataUrl: string, filename: string) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    const u8arr = new Uint8Array(bstr.length);

    Array.from(bstr).forEach((char, index) => {
      u8arr[index] = char.charCodeAt(0);
    });

    return new File([u8arr], filename, { type: mime });
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const frameElement = document.getElementById('alignment-frame');
      canvas.width = frameElement?.clientWidth || 0;
      canvas.height = frameElement?.clientHeight || 0;

      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg');
      const file = dataURLtoFile(dataUrl, `photo-${Date.now()}.jpg`);
      const newFile = {
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        url: URL.createObjectURL(file),
      } as IFileWithUrl;

      setSelectedCertificates((prev) => [...prev, newFile]);
    }
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

  const openCameraHanler = () => {
    setIsCameraOpen(true);
    startCamera();
  };

  const closeCameraHandler = () => {
    setIsCameraOpen(false);
    stopCamera();
  };

  useEffect(() => {
    if (isCameraOpen) {
      startCamera();
    }
    if (router.isReady && query.token) {
      setToken(query.token as string);
    }
    // Info: (20241011 - tzuhan) 判斷裝置是否為手機
    const userAgent = navigator.userAgent || navigator.vendor;
    if (/android|iPad|iPhone|iPod/i.test(userAgent)) {
      setIsMobile(true);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      adjustFrameSize();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
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
        // eslint-disable-next-line tailwindcss/no-arbitrary-value
        className={`grid h-screen grid-rows-[100px_1fr_85px] ${uploadMode === UploadMode.CAMERA ? '' : 'hidden'}`}
      >
        <div className="flex h-100px shrink-0 items-center bg-surface-neutral-solid-dark p-2">
          {isCameraOpen && (
            <Button className="" type="button" variant={null} onClick={closeCameraHandler}>
              <MdArrowBack size={24} className="text-stroke-neutral-invert" />
            </Button>
          )}
          {/* Info: (20241011 - tzuhan) 拍照預覽區域 */}
          <div className="flex-1">
            <div className="flex gap-2 overflow-x-scroll">
              {selectedCertificates.map((certificate, index) => (
                <div key={`image-${index + 1}`} className="h-77px w-50px">
                  <Image
                    src={certificate.url}
                    alt={`Captured ${index}`}
                    width={77}
                    height={50}
                    className="object-fill"
                  />
                </div>
              ))}
            </div>
          </div>
          <Button
            id="camera-upload-image-button"
            type="button"
            variant="default"
            onClick={uploadCertificates}
            className={`rounded-xs px-3`}
            disabled={isUploading || selectedCertificates.length === 0}
          >
            <FiUpload size={20} className="leading-none text-button-text-secondary" />
          </Button>
        </div>

        {/* Info: (20241011 - tzuhan) 拍照區域 */}
        <div
          // eslint-disable-next-line tailwindcss/no-arbitrary-value
          className={`relative h-full max-h-[calc(100vh-185px)] ${isCameraOpen ? 'hidden' : ''}`}
        >
          <RxCamera
            onClick={openCameraHanler}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            size={120}
          />
        </div>

        <div
          className={`relative flex items-center justify-center ${isCameraOpen ? '' : 'hidden'}`}
        >
          {isMobile ? (
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCertificateChange}
            />
          ) : (
            <div className="relative h-full w-full">
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="absolute left-1/2 top-4 h-fit w-fit -translate-x-1/2 rounded-full bg-black/50 p-2 px-6 text-text-neutral-solid-light">
                  Put the document in the frame
                </div>
                {/* Info: (20241011 - tzuhan) 對齊框 */}
                <div
                  id="alignment-frame"
                  className="relative border-4 border-yellow-500"
                  style={{ aspectRatio: '1.54' }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    // eslint-disable-next-line tailwindcss/no-arbitrary-value
                    className="h-full w-full object-cover"
                  >
                    <track kind="captions" />
                  </video>
                  <canvas ref={canvasRef} className="hidden"></canvas>
                  {/* 四個角上的圓點 */}
                  <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-yellow-500"></div>
                  <div className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full bg-yellow-500"></div>
                  <div className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-full bg-yellow-500"></div>
                  <div className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-full bg-yellow-500"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info: (20241011 - tzuhan) 底部功能區 */}
        <div className="flex h-100px shrink-0 -translate-y-15px items-center justify-between rounded-t-lg bg-surface-neutral-solid-dark p-2">
          <button
            type="button"
            onClick={() => setUploadMode(UploadMode.ALBUM)}
            className="rounded-md bg-gray-300 px-4 py-2"
          >
            Open Album
          </button>
          <button
            type="button"
            onClick={capturePhoto}
            className="flex h-55px w-55px items-center justify-center rounded-full bg-surface-neutral-solid-light"
          >
            <div className="h-45px w-45px rounded-full border-2 border-stroke-brand-secondary bg-surface-neutral-solid-light"></div>
          </button>
          <Button
            variant="tertiaryBorderless"
            onClick={() => setFlashEnabled(!flashEnabled)}
            disabled={!flashEnabled}
          >
            <Image src="/elements/flash.svg" alt="Flash" width={24} height={24} />
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
