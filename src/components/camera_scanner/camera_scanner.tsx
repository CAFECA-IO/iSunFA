import { useRef, useState, useEffect } from 'react';
import { RxCross2 } from 'react-icons/rx';
import { FiRotateCw, FiCrop } from 'react-icons/fi';
import { PiCameraLight } from 'react-icons/pi';
import { GrLinkNext } from 'react-icons/gr';
import { TbArrowBackUp } from 'react-icons/tb';

// ToDo: (20240523 - Luphia) fix loop import issue
// eslint-disable-next-line import/no-cycle
import { useGlobalCtx } from '@/contexts/global_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import { Button } from '@/components/button/button';
import { MessageType } from '@/interfaces/message_modal';
import { ProgressStatus } from '@/constants/account';
import { useUserCtx } from '@/contexts/user_context';
import { useTranslation } from 'next-i18next';

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
  const { t } = useTranslation('common');
  const { messageModalDataHandler, messageModalVisibilityHandler } = useGlobalCtx();
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
          content: 'Failed to get camera video, please check your camera settings.',
          messageType: MessageType.ERROR,
          submitBtnStr: t('COMMON.CLOSE'),
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const file = new File([blob as any], 'canvas-image.png', { type: 'image/png' });

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
            title: 'Upload Invoice Failed', // ToDo: (20240823 - Julian) i18n
            content: `Upload invoice failed(${uploadCode}): ${result.status}`,
            messageType: MessageType.ERROR,
            submitBtnStr: t('COMMON.CLOSE'),
            submitBtnFunction: () => messageModalVisibilityHandler(),
          });
          messageModalVisibilityHandler();
        }
      });
    }
    if (uploadSuccess === false) {
      messageModalDataHandler({
        title: 'Upload Invoice Failed', // ToDo: (20240823 - Julian) i18n
        content: `Upload invoice failed(${uploadCode})`,
        messageType: MessageType.ERROR,
        submitBtnStr: t('COMMON.CLOSE'),
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
      <button
        id="crop-button"
        type="button"
        disabled
        className="flex h-36px w-36px items-center justify-center rounded-full border bg-secondaryBlue text-button-text-invert hover:bg-primaryYellow disabled:bg-lightGray5"
      >
        <FiCrop size={16} />
      </button>
      {/* Info: (20240506 - Julian) rotate button */}
      <button
        id="rotate-button"
        type="button"
        disabled
        className="flex h-36px w-36px items-center justify-center rounded-full border bg-secondaryBlue text-button-text-invert hover:bg-primaryYellow disabled:bg-lightGray5"
      >
        <FiRotateCw size={16} />
      </button>
    </div>
  ) : (
    // Info: (20240506 - Julian) shutter button
    <button
      id="shutter-button"
      type="button"
      onClick={handleTakePhoto}
      className="h-36px w-36px text-secondaryBlue hover:text-primaryYellow"
    >
      <PiCameraLight size={30} />
    </button>
  );

  const displayFunctionBtn = isPhotoEditorMode ? (
    <div className="flex w-full items-center justify-between px-20px">
      {/* Info: (20240506 - Julian) go back */}
      <button
        id="go-back-button"
        type="button"
        onClick={goBackHandler}
        className="flex items-center justify-center rounded-xs border border-secondaryBlue p-10px text-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow"
      >
        <TbArrowBackUp size={16} />
      </button>
      {/* Info: (20240506 - Julian) upload button */}
      <Button
        id="upload-image-button"
        type="button"
        className="flex items-center gap-x-4px px-16px py-8px"
        onClick={handleUploadImage}
      >
        {t('journal:JOURNAL.UPLOAD')}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            className="fill-current"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8.0026 2.08447C4.73492 2.08447 2.08594 4.73345 2.08594 8.00114C2.08594 10.1902 3.27436 12.1026 5.04482 13.1267C5.40336 13.3341 5.52588 13.7929 5.31848 14.1515C5.11107 14.51 4.65227 14.6325 4.29373 14.4251C2.07884 13.1439 0.585938 10.7473 0.585938 8.00114C0.585938 3.90503 3.90649 0.584473 8.0026 0.584473C12.0987 0.584473 15.4193 3.90503 15.4193 8.00114C15.4193 10.8626 13.7986 13.3443 11.4285 14.5807C11.4181 14.5861 11.4076 14.5916 11.3971 14.5971C11.1832 14.7089 10.9361 14.838 10.6539 14.9115C10.3338 14.995 10.0128 14.9993 9.63339 14.9479C9.2752 14.8994 8.89154 14.7188 8.59754 14.5405C8.30353 14.3623 7.96594 14.1057 7.75725 13.8106C7.251 13.0946 7.25169 12.406 7.25254 11.5713C7.25257 11.5371 7.2526 11.5026 7.2526 11.4678V7.14513L5.86627 8.53147C5.57337 8.82436 5.0985 8.82436 4.80561 8.53147C4.51271 8.23858 4.51271 7.7637 4.80561 7.47081L7.47227 4.80414C7.61293 4.66349 7.80369 4.58447 8.0026 4.58447C8.20152 4.58447 8.39228 4.66349 8.53293 4.80414L11.1996 7.47081C11.4925 7.7637 11.4925 8.23858 11.1996 8.53147C10.9067 8.82436 10.4318 8.82436 10.1389 8.53147L8.7526 7.14513V11.4678C8.7526 12.4404 8.77499 12.6518 8.98199 12.9445C9.01715 12.9942 9.15252 13.1229 9.37515 13.2578C9.59778 13.3928 9.77444 13.4533 9.83478 13.4615C10.0853 13.4955 10.1989 13.48 10.2754 13.4601C10.376 13.4339 10.4774 13.385 10.7348 13.2508C12.6289 12.2627 13.9193 10.282 13.9193 8.00114C13.9193 4.73345 11.2703 2.08447 8.0026 2.08447Z"
            fill="#996301"
          />
        </svg>
      </Button>
    </div>
  ) : (
    <div className="flex w-full items-center justify-between px-20px">
      {isPreviewMode ? (
        /* Info: (20240506 - Julian) go back button */
        <button
          id="go-back-button"
          type="button"
          onClick={goBackHandler}
          className="flex items-center justify-center rounded-xs border border-secondaryBlue p-10px text-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow"
        >
          <TbArrowBackUp size={16} />
        </button>
      ) : (
        // eslint-disable-next-line jsx-a11y/label-has-associated-control
        <label
          htmlFor="uploadImageFromAlbum"
          className="relative flex items-center justify-center rounded-xs border border-secondaryBlue p-10px text-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className="fill-current"
              fillRule="evenodd"
              clipRule="evenodd"
              d="M4.5055 1.2511L4.53594 1.2511H11.4693L11.4997 1.2511C12.0339 1.25109 12.4797 1.25108 12.8439 1.28084C13.2238 1.31188 13.5805 1.37899 13.9177 1.55083C14.4352 1.81448 14.8559 2.23518 15.1195 2.75263C15.2914 3.08989 15.3585 3.44654 15.3895 3.82643C15.4193 4.19067 15.4193 4.63653 15.4193 5.17069V5.2011V10.8011V10.8315C15.4193 11.3657 15.4193 11.8115 15.3895 12.1758C15.3585 12.5557 15.2914 12.9123 15.1195 13.2496C14.8559 13.767 14.4352 14.1877 13.9177 14.4514C13.5805 14.6232 13.2238 14.6903 12.8439 14.7214C12.4797 14.7511 12.0339 14.7511 11.4997 14.7511H11.4693H4.53594H4.50549C3.97134 14.7511 3.5255 14.7511 3.16127 14.7214C2.78138 14.6903 2.42473 14.6232 2.08746 14.4514C1.57002 14.1877 1.14932 13.767 0.88567 13.2496C0.713826 12.9123 0.646715 12.5557 0.615677 12.1758C0.585918 11.8115 0.585927 11.3657 0.585938 10.8315L0.585938 10.8011V5.2011L0.585938 5.17066C0.585927 4.63651 0.585918 4.19066 0.615677 3.82643C0.646715 3.44654 0.713826 3.08989 0.88567 2.75263C1.14932 2.23518 1.57002 1.81448 2.08746 1.55083C2.42473 1.37899 2.78138 1.31188 3.16127 1.28084C3.5255 1.25108 3.97135 1.25109 4.5055 1.2511ZM3.28342 2.77586C2.99629 2.79932 2.85901 2.8412 2.76845 2.88734C2.53325 3.00718 2.34202 3.19841 2.22218 3.43361C2.17604 3.52417 2.13415 3.66145 2.1107 3.94858C2.08652 4.24446 2.08594 4.62867 2.08594 5.2011V10.8011C2.08594 11.3735 2.08652 11.7577 2.1107 12.0536C2.13415 12.3407 2.17604 12.478 2.22218 12.5686C2.31173 12.7443 2.44114 12.8955 2.59897 13.0107L6.71803 8.89168C6.72343 8.88628 6.72883 8.88088 6.73423 8.87548C6.85212 8.75755 6.97019 8.63945 7.07902 8.54706C7.19952 8.44476 7.35706 8.33075 7.56483 8.26325C7.84936 8.1708 8.15585 8.1708 8.44038 8.26325C8.64815 8.33076 8.80569 8.44476 8.9262 8.54706C9.03502 8.63945 9.1531 8.75756 9.27099 8.87549L9.28718 8.89168L9.33594 8.94044L10.718 7.55835L10.7342 7.54216C10.8521 7.42423 10.9702 7.30612 11.079 7.21373C11.1995 7.11143 11.3571 6.99742 11.5648 6.92991C11.8494 6.83746 12.1559 6.83746 12.4404 6.92991C12.6482 6.99742 12.8057 7.11143 12.9262 7.21373C13.035 7.30611 13.1531 7.42422 13.271 7.54215L13.2872 7.55835L13.9193 8.19044V5.2011C13.9193 4.62867 13.9187 4.24446 13.8945 3.94858C13.8711 3.66145 13.8292 3.52417 13.783 3.43361C13.6632 3.19841 13.472 3.00718 13.2368 2.88734C13.1462 2.8412 13.0089 2.79932 12.7218 2.77586C12.4259 2.75168 12.0417 2.7511 11.4693 2.7511H4.53594C3.96351 2.7511 3.5793 2.75168 3.28342 2.77586ZM13.9193 10.3118L12.2265 8.61901C12.1216 8.51405 12.0537 8.44662 12.0026 8.39931C11.9515 8.44662 11.8837 8.51405 11.7787 8.61901L10.3966 10.0011L13.4062 13.0107C13.5641 12.8955 13.6935 12.7443 13.783 12.5686C13.8292 12.478 13.8711 12.3407 13.8945 12.0536C13.9187 11.7577 13.9193 11.3735 13.9193 10.8011V10.3118ZM11.5253 13.2511L8.80615 10.532C8.80597 10.5318 8.80579 10.5316 8.80561 10.5314C8.80543 10.5312 8.80525 10.5311 8.80507 10.5309L8.22652 9.95234L8.75685 9.42201L8.22652 9.95234C8.12156 9.84738 8.05367 9.77995 8.0026 9.73264C7.95154 9.77995 7.88365 9.84738 7.77869 9.95234L4.47993 13.2511C4.4984 13.2511 4.51707 13.2511 4.53594 13.2511H11.4693C11.4881 13.2511 11.5068 13.2511 11.5253 13.2511ZM5.33594 5.41777C5.01377 5.41777 4.7526 5.67893 4.7526 6.0011C4.7526 6.32327 5.01377 6.58443 5.33594 6.58443C5.6581 6.58443 5.91927 6.32327 5.91927 6.0011C5.91927 5.67893 5.6581 5.41777 5.33594 5.41777ZM3.2526 6.0011C3.2526 4.85051 4.18535 3.91777 5.33594 3.91777C6.48653 3.91777 7.41927 4.85051 7.41927 6.0011C7.41927 7.15169 6.48653 8.08443 5.33594 8.08443C4.18535 8.08443 3.2526 7.15169 3.2526 6.0011Z"
              fill="#001840"
            />
          </svg>

          <input
            id="uploadImageFromAlbum"
            name="uploadImageFromAlbum"
            accept="image/*"
            type="file"
            className="hidden"
            onChange={handleInputChange}
          />
        </label>
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
        <div className="relative flex h-fit w-320px flex-col items-center gap-y-16px rounded-sm bg-surface-neutral-surface-lv2 py-16px text-navyBlue2">
          {/* Info: (20240506 - Julian) title */}
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-bold">{titleStr}</h1>
            <p className="text-xs text-lightGray5">{subTitleStr}</p>
          </div>
          {/* Info: (20240506 - Julian) close button */}
          <button
            type="button"
            onClick={handleCloseCamera}
            className="absolute right-12px top-12px text-lightGray5"
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
