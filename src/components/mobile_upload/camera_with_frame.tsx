import { useModalContext } from '@/contexts/modal_context';
import { MessageType } from '@/interfaces/message_modal';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/button/button';
import Image from 'next/image';
import { FiUpload } from 'react-icons/fi';
import { MdArrowBack } from 'react-icons/md';
import { ImFilePicture } from 'react-icons/im';
import loggerFront from '@/lib/utils/logger_front';

export enum UploadMode {
  CAMERA = 'CAMERA',
  ALBUM = 'ALBUM',
}

export interface IFileWithUrl extends File {
  file: File;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  url: string;
}

interface CameraWithFrameProps {
  onCapture: (file: File) => void;
  setUploadMode: (mode: UploadMode) => void;
  selectedCertificates: IFileWithUrl[];
  isUploading: boolean;
  onUpload: () => Promise<void>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const CameraWithFrame: React.FC<CameraWithFrameProps> = ({
  onCapture,
  setUploadMode,
  selectedCertificates,
  isUploading,
  onUpload,
  onFileChange,
}: CameraWithFrameProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const { messageModalDataHandler, messageModalVisibilityHandler } = useModalContext();
  const [flashEnabled, setFlashEnabled] = useState<boolean>(false);

  const adjustFrameSize = () => {
    const aspectRatio = 1.54;
    let frameWidth = 0;
    let frameHeight = 0;
    if (window.innerWidth > window.innerHeight) {
      frameHeight = (window.innerHeight - 200) * 0.7;
      frameWidth = frameHeight / aspectRatio;
    } else {
      frameWidth = window.innerWidth * 0.6;
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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: flashEnabled ? 'user' : 'environment' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraStream(stream);
      }
    } catch (error) {
      loggerFront.error('Camera error:', error);

      messageModalDataHandler({
        title: 'Camera Error', // ToDo: (20240823 - Julian) i18n
        content: `${error ? (error as Error).message : '相機不支援此裝置或瀏覽器。'}`,
        messageType: MessageType.ERROR,
        submitBtnStr: 'Close',
        submitBtnFunction: () => {
          messageModalVisibilityHandler();
        },
      });
      messageModalVisibilityHandler();
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
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
      canvas.width = frameElement?.clientWidth || video.videoWidth;
      canvas.height = frameElement?.clientHeight || video.videoHeight;

      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg');
      const file = dataURLtoFile(dataUrl, `photo-${Date.now()}.jpg`);
      onCapture(file);
    }
  };

  const handleModeUpload = () => {
    if (inputRef.current) {
      setUploadMode(UploadMode.ALBUM);
      inputRef.current.click();
    }
  };

  useEffect(() => {
    if (videoRef.current && navigator.mediaDevices) {
      startCamera();
    }
  }, [flashEnabled, videoRef.current]);

  useEffect(() => {
    adjustFrameSize();

    window.addEventListener('resize', adjustFrameSize);
    return () => {
      stopCamera();
      window.removeEventListener('resize', adjustFrameSize);
    };
  }, []);

  return (
    <>
      <div className="flex h-100px shrink-0 items-center bg-surface-neutral-solid-dark p-2">
        <Button
          className="p-2 text-stroke-neutral-invert"
          type="button"
          variant={null}
          onClick={() => {}}
        >
          <MdArrowBack size={24} />
        </Button>

        {/* Info: (20241011 - tzuhan) 拍照預覽區域 */}
        <div className="flex-1">
          {/* Info: (20241210 - tzuhan) 隱藏 scrollbar */}
          <div className="hide-scrollbar flex gap-2 overflow-x-scroll">
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
          onClick={onUpload}
          className={`m-2 rounded-xs px-3`}
          disabled={isUploading || selectedCertificates.length === 0}
        >
          <FiUpload size={20} className="leading-none text-button-text-secondary" />
        </Button>
      </div>

      {/* Info: (20241011 - tzuhan) 拍照區域 */}
      <div className="relative flex items-center justify-center">
        <div className="relative h-full w-full">
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div
              id="alignment-frame"
              className="relative border-4 border-stroke-brand-primary"
              style={{ aspectRatio: '1.54' }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              >
                <track kind="captions" />
              </video>
              <canvas ref={canvasRef} className="hidden"></canvas>
              <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-surface-neutral-solid-light"></div>
              <div className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full bg-surface-neutral-solid-light"></div>
              <div className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-full bg-surface-neutral-solid-light"></div>
              <div className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-full bg-surface-neutral-solid-light"></div>
              <div className="absolute -top-11 left-1/2 h-fit w-260px -translate-x-1/2 rounded-full bg-black/50 p-1 px-6 text-text-neutral-solid-light">
                Put the document in the frame
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Info: (20241011 - tzuhan) 底部功能區 */}
      <div className="flex h-105px shrink-0 -translate-y-20px items-center justify-between rounded-t-lg bg-surface-neutral-solid-dark p-2">
        <Button
          type="button"
          variant={null}
          onClick={handleModeUpload}
          className="p-2 text-stroke-neutral-invert"
        >
          <ImFilePicture size={40} />
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            ref={inputRef}
            onChange={onFileChange}
          />
        </Button>
        <button
          type="button"
          onClick={capturePhoto}
          className="flex h-55px w-55px items-center justify-center rounded-full bg-surface-neutral-solid-light"
        >
          <div className="h-45px w-45px rounded-full border-2 border-stroke-brand-secondary bg-surface-neutral-solid-light"></div>
        </button>
        <Button
          className="p-2 text-stroke-neutral-invert"
          type="button"
          variant={null}
          onClick={() => setFlashEnabled(!flashEnabled)}
          disabled={!flashEnabled}
        >
          <Image src="/elements/flash.svg" alt="Flash" width={32} height={32} />
        </Button>
      </div>
    </>
  );
};

export default CameraWithFrame;
