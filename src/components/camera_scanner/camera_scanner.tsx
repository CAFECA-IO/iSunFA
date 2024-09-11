import { useRef, useState, useEffect } from 'react';
import { RxCross2 } from 'react-icons/rx';
import { FiRotateCw, FiCrop, FiUploadCloud } from 'react-icons/fi';
import { PiCameraLight } from 'react-icons/pi';
import { GrLinkNext } from 'react-icons/gr';
import { TbArrowBackUp } from 'react-icons/tb';
import { useModalContext } from '@/contexts/modal_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import { Button } from '@/components/button/button';
import { MessageType } from '@/interfaces/message_modal';
import { ProgressStatus } from '@/constants/account';
import { useUserCtx } from '@/contexts/user_context';
import { useTranslation } from 'next-i18next';
import { IoImageOutline } from 'react-icons/io5';

// Info: (20240506 - Julian) const
const PHOTO_WIDTH = 320;
const PHOTO_HEIGHT = 356;
interface ICameraScannerProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

enum ScannerStep {
  Camera = 'Camera',
  Preview = 'Preview',
  PhotoEditor = 'PhotoEditor',
}

const CameraScanner = ({ isModalVisible, modalVisibilityHandler }: ICameraScannerProps) => {
  const { t } = useTranslation(['common', 'journal']);
  const { messageModalDataHandler, messageModalVisibilityHandler } = useModalContext();
  const { selectedCompany } = useUserCtx();
  const { setInvoiceIdHandler } = useAccountingCtx();
  const {
    trigger: uploadInvoice,
    data: results,
    success: uploadSuccess,
    code: uploadCode,
  } = APIHandler<IAccountResultStatus[]>(APIName.OCR_UPLOAD);

  // Info: (20240507 - Julian) 從相簿上傳照片
  const [uploadImage, setUploadImage] = useState<File | null>(null);
  // Info: (20240507 - Julian) 檢查步驟
  const [currentStep, setCurrentStep] = useState<ScannerStep>(ScannerStep.Camera);
  // Info: (20240528 - Julian) 決定是否顯示 modal 的 flag
  const [isShowSuccessModal, setIsShowSuccessModal] = useState<boolean>(false);

  const isCameraMode = currentStep === ScannerStep.Camera;
  const isPreviewMode = currentStep === ScannerStep.Preview;
  const isPhotoEditorMode = currentStep === ScannerStep.PhotoEditor;

  const cameraRef = useRef<HTMLVideoElement>(null);
  const photoRef = useRef<HTMLCanvasElement>(null);

  // Info: (20240506 - Julian) 將拍照的畫面顯示在 canvas 上
  const handleTakePhoto = () => {
    const photo = photoRef.current;
    const camera = cameraRef.current;

    const ctx = photo?.getContext('2d');
    if (!ctx || !camera) return;
    ctx.drawImage(camera, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);

    setCurrentStep(ScannerStep.Preview); // Info: (20240507 - Julian) 轉成預覽模式
  };

  const goBackHandler = () => {
    if (isPreviewMode) {
      // Info: (20240506 - Julian) 如果是預覽模式，則返回相機模式
      setCurrentStep(ScannerStep.Camera);
    } else if (isPhotoEditorMode) {
      // Info: (20240506 - Julian) 如果是照片編輯模式，則返回預覽模式
      setCurrentStep(ScannerStep.Preview);
    }
  };

  const nextHandler = () => {
    setCurrentStep(ScannerStep.PhotoEditor);
  };

  // Info: (20240506 - Julian) 取得攝影機畫面
  const getCameraVideo = () => {
    if (!isModalVisible || !selectedCompany) return;
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: PHOTO_WIDTH,
          height: PHOTO_HEIGHT,
          deviceId: 'default',
          facingMode: 'environment', // Info: (20240507 - Julian) 使用後置鏡頭
        },
        audio: false,
      })
      .then((stream) => {
        const video = cameraRef.current;
        if (video) {
          video.srcObject = stream;
          video.play();
        }
      })
      .catch(() => {
        // Info: (20240823 - Julian) Show error message
        messageModalDataHandler({
          title: 'Camera Error', // ToDo: (20240823 - Julian) i18n
          content: t('journal:JOURNAL.FAILED_TO_GET_CAMERA_VIDEO'),
          messageType: MessageType.ERROR,
          submitBtnStr: t('common:COMMON.CLOSE'),
          submitBtnFunction: () => messageModalVisibilityHandler(),
        });
        messageModalVisibilityHandler();
      });
  };

  // Info: (20240506 - Julian) 關閉面板並停止攝影機
  const handleCloseCamera = () => {
    const video = cameraRef.current;
    if (video && video.srcObject && video.srcObject instanceof MediaStream) {
      video.srcObject.getTracks().forEach((track) => {
        track.stop();
      });
      video.srcObject = null;
    }

    // Info: (20240506 - Julian) 關閉面板
    modalVisibilityHandler();
  };

  // Info: (20240506 - Julian) 上傳照片
  const handleUploadImage = async () => {
    // Info: (20240506 - Julian) 將拍照後的畫面上傳至 OCR API
    const formData = new FormData();
    const photo = photoRef.current;
    if (!photo) return;
    const blob = await new Promise((resolve) => {
      photo.toBlob(resolve, 'image/png');
    });
    // Info: (20240508 - Emily) Create a new file from the blob (optional but helpful for naming)
    const file = new File([blob as Blob], 'canvas-image.png', { type: 'image/png' });

    formData.append('image', file);
    setIsShowSuccessModal(true); // Info: (20240528 - Julian) 點擊上傳後才升起 flag
    uploadInvoice({ params: { companyId: selectedCompany!.id }, body: formData });

    // Info: (20240506 - Julian) 關閉攝影機
    handleCloseCamera();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadImage(file);
    }
  };

  useEffect(() => {
    if (!isModalVisible || !selectedCompany) return; // Info: (20240523 - Shirley) 在 modal 隱藏時，不做任何事情

    // Info: (20240522 - Julian) 清空 invoiceId
    setInvoiceIdHandler(undefined);

    if (isModalVisible && selectedCompany) {
      // Info: (20240506 - Julian) 版面重啟時，將步驟設定為相機模式，並開啟攝影機
      setCurrentStep(ScannerStep.Camera);
      getCameraVideo();
    }
  }, [isModalVisible, selectedCompany]);

  useEffect(() => {
    if (uploadSuccess && results && isShowSuccessModal) {
      results.forEach((result) => {
        const { resultId } = result;
        /* Info: (20240805 - Anna) 將狀態的翻譯key值存到變數 */
        const translatedStatus = t(
          `journal:PROGRESS_STATUS.${result.status.toUpperCase().replace(/_/g, '_')}`
        );
        if (
          result.status === ProgressStatus.ALREADY_UPLOAD ||
          result.status === ProgressStatus.SUCCESS ||
          result.status === ProgressStatus.PAUSED ||
          result.status === ProgressStatus.IN_PROGRESS
        ) {
          messageModalDataHandler({
            title: t('journal:JOURNAL.UPLOAD_SUCCESSFUL'),
            // Info: (20240805 - Anna) 將上傳狀態替換為翻譯過的
            // content: result.status,
            content: translatedStatus,
            messageType: MessageType.SUCCESS,
            submitBtnStr: t('journal:JOURNAL.DONE'),
            submitBtnFunction: () => {
              setInvoiceIdHandler(resultId);
              messageModalVisibilityHandler();
            },
          });
          messageModalVisibilityHandler();
          setIsShowSuccessModal(false); // Info: (20240528 - Julian) 顯示完後將 flag 降下
        } else {
          // Info: (20240522 - Julian) 顯示上傳失敗的錯誤訊息
          messageModalDataHandler({
            title: t('journal:JOURNAL.UPLOAD_INVOICE_FAILED'),
            content: t('journal:JOURNAL.UPLOAD_INVOICE_FAILED_INSERT', {
              uploadCode,
              status: result.status,
            }),
            messageType: MessageType.ERROR,
            submitBtnStr: t('common:COMMON.CLOSE'),
            submitBtnFunction: () => messageModalVisibilityHandler(),
          });
          messageModalVisibilityHandler();
        }
      });
    }
    if (uploadSuccess === false) {
      messageModalDataHandler({
        title: t('journal:JOURNAL.UPLOAD_INVOICE_FAILED'),
        // Info: (20240902 - Anna) `Upload invoice failed(${uploadCode})`,因為錯誤代碼不需要顯示給用戶看，所以改為空字串
        content: '',
        messageType: MessageType.ERROR,
        submitBtnStr: t('common:COMMON.CLOSE'),
        submitBtnFunction: () => messageModalVisibilityHandler(),
      });
      messageModalVisibilityHandler();
    }
  }, [uploadSuccess, results, isModalVisible, uploadCode]);

  useEffect(() => {
    // Info: (20240507 - Julian) 如果從相簿選擇照片，則將照片顯示在 canvas 上，並轉為預覽模式
    if (uploadImage) {
      const photo = photoRef.current;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const ctx = photo?.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
        };
      };
      reader.readAsDataURL(uploadImage);

      setCurrentStep(ScannerStep.Preview);
    }
  }, [uploadImage]);

  const titleStr = isPhotoEditorMode ? 'Photo Editor' : 'Camera Scanner';
  const subTitleStr = isPhotoEditorMode
    ? 'Flip and adjust photos'
    : 'Please align the files in the shooting area.';

  const displayCamera = (
    <>
      {/* Info: (20240506 - Julian) 顯示拍照後的畫面 */}
      <canvas
        ref={photoRef}
        width={PHOTO_WIDTH}
        height={PHOTO_HEIGHT}
        className={isCameraMode ? 'hidden' : 'block'}
      ></canvas>

      {/* Info: (20240506 - Julian) 顯示攝影機畫面 */}
      <video
        ref={cameraRef}
        id="user-camera"
        width={PHOTO_WIDTH}
        height={PHOTO_HEIGHT}
        className={`relative ${isCameraMode ? 'block' : 'hidden'}`}
        playsInline
        muted
        autoPlay
      >
        <track kind="captions" />
      </video>
    </>
  );

  const displayMainBtn = isPhotoEditorMode ? (
    // ToDo: (20240506 - Julian) [Beta] function not implemented
    <div className="flex items-center gap-x-24px">
      {/* Info: (20240506 - Julian) crop button */}
      <Button
        id="crop-button"
        type="button"
        variant="tertiary"
        className="h-36px w-36px rounded-full p-0"
        disabled
      >
        <FiCrop size={16} />
      </Button>
      {/* Info: (20240506 - Julian) rotate button */}
      <Button
        id="rotate-button"
        type="button"
        variant="tertiary"
        className="h-36px w-36px rounded-full p-0"
        disabled
      >
        <FiRotateCw size={16} />
      </Button>
    </div>
  ) : (
    // Info: (20240506 - Julian) shutter button
    <Button
      id="shutter-button"
      type="button"
      onClick={handleTakePhoto}
      variant="secondaryBorderless"
      className="h-36px w-36px p-0"
    >
      <PiCameraLight size={30} />
    </Button>
  );

  const displayFunctionBtn = isPhotoEditorMode ? (
    <div className="flex w-full items-center justify-between px-20px">
      {/* Info: (20240506 - Julian) go back */}
      <Button
        id="go-back-button"
        type="button"
        onClick={goBackHandler}
        variant="secondaryOutline"
        className="h-40px w-40px p-0"
      >
        <TbArrowBackUp size={16} />
      </Button>
      {/* Info: (20240506 - Julian) upload button */}
      <Button
        id="upload-image-button"
        type="button"
        variant="secondaryBorderless"
        className="gap-x-4px p-0"
        onClick={handleUploadImage}
      >
        {t('journal:JOURNAL.UPLOAD')}
        <FiUploadCloud size={16} />
      </Button>
    </div>
  ) : (
    <div className="flex w-full items-center justify-between px-20px">
      {isPreviewMode ? (
        /* Info: (20240506 - Julian) go back button */
        <Button
          id="go-back-button"
          type="button"
          onClick={goBackHandler}
          variant="secondaryOutline"
          className="h-40px w-40px p-0"
        >
          <TbArrowBackUp size={16} />
        </Button>
      ) : (
        <Button
          id="go-back-button"
          type="button"
          variant="secondaryOutline"
          className="h-40px w-40px p-0"
        >
          {/* Info: (20240830 - Anna) 因為出現 A form label must be associated with a control. 錯誤，所以增加 id="uploadImageLabel"和aria-labelledby="uploadImageLabel"來關聯 */}
          <label
            id="uploadImageLabel"
            htmlFor="uploadImageFromAlbum"
            className="flex h-full w-full cursor-pointer items-center justify-center"
          >
            <IoImageOutline size={16} />
            <input
              id="uploadImageFromAlbum"
              name="uploadImageFromAlbum"
              accept="image/*"
              type="file"
              className="hidden"
              aria-labelledby="uploadImageLabel"
              onChange={handleInputChange}
            />
          </label>
        </Button>
      )}
      <Button
        type="button"
        disabled={isCameraMode}
        className="flex items-center gap-x-4px px-16px py-8px"
        onClick={nextHandler}
      >
        {t('journal:JOURNAL.NEXT')}
        <GrLinkNext />
      </Button>
    </div>
  );

  const isDisplayScanner =
    selectedCompany && isModalVisible ? (
      <div className="fixed inset-0 left-0 top-0 z-70 flex h-full w-full items-center justify-center bg-black/50">
        <div className="relative flex h-fit w-320px flex-col items-center gap-y-16px rounded-sm bg-surface-neutral-surface-lv2 py-16px">
          {/* Info: (20240506 - Julian) title */}
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-bold text-card-text-primary">{titleStr}</h1>
            <p className="text-xs text-card-text-secondary">{subTitleStr}</p>
          </div>
          {/* Info: (20240506 - Julian) close button */}
          <button
            type="button"
            onClick={handleCloseCamera}
            className="absolute right-12px top-12px text-icon-surface-single-color-primary"
          >
            <RxCross2 size={20} />
          </button>
          {/* Info: (20240506 - Julian) camera */}
          {displayCamera}
          {/* Info: (20240506 - Julian) function buttons */}
          <div className="flex w-full flex-col items-center gap-32px">
            {displayMainBtn}
            {displayFunctionBtn}
          </div>
        </div>
      </div>
    ) : null;

  return isDisplayScanner;
};

export default CameraScanner;
