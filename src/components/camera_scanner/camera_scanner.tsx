import { useRef, useState, useEffect } from 'react';
import { RxCross2 } from 'react-icons/rx';
import { FiRotateCw, FiCrop } from 'react-icons/fi';
import { PiCameraLight } from 'react-icons/pi';
import { GrLinkNext } from 'react-icons/gr';
import { TbArrowBackUp } from 'react-icons/tb';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { Button } from '../button/button';

// Info: (20240506 - Julian) const
const width = 320;
const height = 356;
interface ICameraScannerProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const CameraScanner = ({ isModalVisible, modalVisibilityHandler }: ICameraScannerProps) => {
  const { setOcrResultIdHandler } = useAccountingCtx();

  // Info: (20240506 - Julian) 檢查是否已經拍照
  const [isTakePhoto, setIsTakePhoto] = useState(false);

  const cameraRef = useRef<HTMLVideoElement>(null);
  const photoRef = useRef<HTMLCanvasElement>(null);

  // Info: (20240506 - Julian) 將拍照的畫面顯示在 canvas 上
  const handleTakePhoto = () => {
    const photo = photoRef.current;
    const camera = cameraRef.current;

    const ctx = photo?.getContext('2d');
    if (!ctx || !camera) return;
    ctx.drawImage(camera, 0, 0, width, height);

    setIsTakePhoto(true);
  };

  const goBackHandler = () => setIsTakePhoto(false);

  // Info: (20240506 - Julian) 取得攝影機畫面
  const getCameraVideo = () => {
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width,
          height,
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
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Error: ', err);
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
    modalVisibilityHandler();
  };

  // Info: (20240506 - Julian) 上傳照片
  const uploadImage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      // Info: (20240506 - Julian) 將拍照後的畫面上傳至 OCR API
      const formData = new FormData();
      const photo = photoRef.current;
      if (!photo) return;
      formData.append('file', photo.toDataURL('image/jpeg'));

      // ToDo: (20240506 - Julian) API 文件調整中
      const response = await fetch(`/api/v1/company/1/invoice`, {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        // Info: (20240506 - Julian) 將 OCR 結果 id 寫入 context
        const { resultId } = data.payload[0];
        setOcrResultIdHandler(resultId);
      }

      // Info: (20240506 - Julian) 關閉面板
      handleCloseCamera();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error: ', error);
    }
  };

  useEffect(() => {
    if (isModalVisible) {
      setIsTakePhoto(false);
      getCameraVideo();
    }
  }, [isModalVisible]);

  const titleStr = isTakePhoto ? 'Photo Editor' : 'Camera Scanner';
  const subTitleStr = isTakePhoto
    ? 'Flip and adjust photos'
    : 'Please align the files in the shooting area.';

  const displayCamera = (
    <>
      {/* Info: (20240506 - Julian) 顯示拍照後的畫面 */}
      <canvas
        ref={photoRef}
        width={width}
        height={height}
        className={isTakePhoto ? 'block' : 'hidden'}
      ></canvas>

      {/* Info: (20240506 - Julian) 顯示攝影機畫面 */}
      <video
        ref={cameraRef}
        id="user-camera"
        className={`relative ${isTakePhoto ? 'hidden' : 'block'}`}
        playsInline
        muted
        autoPlay
      >
        <track kind="captions" />
      </video>
    </>
  );

  const displayMainBtn = isTakePhoto ? (
    // ToDo: (20240506 - Julian) function not implemented
    <div className="flex items-center gap-x-24px">
      {/* Info: (20240506 - Julian) crop button */}
      <button
        id="crop-button"
        type="button"
        disabled
        className="flex h-36px w-36px items-center justify-center rounded-full border bg-secondaryBlue text-white hover:bg-primaryYellow disabled:bg-lightGray5"
      >
        <FiCrop size={16} />
      </button>
      {/* Info: (20240506 - Julian) rotate button */}
      <button
        id="rotate-button"
        type="button"
        disabled
        className="flex h-36px w-36px items-center justify-center rounded-full border bg-secondaryBlue text-white hover:bg-primaryYellow disabled:bg-lightGray5"
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

  const displayFunctionBtn = isTakePhoto ? (
    <div className="flex w-full items-center justify-between px-20px">
      {/* Info: (20240506 - Julian) go back */}
      <button
        id="go-back-button"
        type="button"
        onClick={goBackHandler}
        className="flex items-center justify-center rounded-xs border border-secondaryBlue p-10px text-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow"
      >
        <TbArrowBackUp size={20} />
      </button>
      {/* Info: (20240506 - Julian) upload button */}
      <Button
        id="upload-image-button"
        type="submit"
        className="flex items-center gap-x-4px px-16px py-8px"
      >
        Upload
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#clip0_1547_98441)">
            <path
              className="fill-current"
              fillRule="evenodd"
              clipRule="evenodd"
              d="M8.0026 2.08447C4.73492 2.08447 2.08594 4.73345 2.08594 8.00114C2.08594 10.1902 3.27436 12.1026 5.04482 13.1267C5.40336 13.3341 5.52588 13.7929 5.31848 14.1515C5.11107 14.51 4.65227 14.6325 4.29373 14.4251C2.07884 13.1439 0.585938 10.7473 0.585938 8.00114C0.585938 3.90503 3.90649 0.584473 8.0026 0.584473C12.0987 0.584473 15.4193 3.90503 15.4193 8.00114C15.4193 10.8626 13.7986 13.3443 11.4285 14.5807C11.4181 14.5861 11.4076 14.5916 11.3971 14.5971C11.1832 14.7089 10.9361 14.838 10.6539 14.9115C10.3338 14.995 10.0128 14.9993 9.63339 14.9479C9.2752 14.8994 8.89154 14.7188 8.59754 14.5405C8.30353 14.3623 7.96594 14.1057 7.75725 13.8106C7.251 13.0946 7.25169 12.406 7.25254 11.5713C7.25257 11.5371 7.2526 11.5026 7.2526 11.4678V7.14513L5.86627 8.53147C5.57337 8.82436 5.0985 8.82436 4.80561 8.53147C4.51271 8.23858 4.51271 7.7637 4.80561 7.47081L7.47227 4.80414C7.61293 4.66349 7.80369 4.58447 8.0026 4.58447C8.20152 4.58447 8.39228 4.66349 8.53293 4.80414L11.1996 7.47081C11.4925 7.7637 11.4925 8.23858 11.1996 8.53147C10.9067 8.82436 10.4318 8.82436 10.1389 8.53147L8.7526 7.14513V11.4678C8.7526 12.4404 8.77499 12.6518 8.98199 12.9445C9.01715 12.9942 9.15252 13.1229 9.37515 13.2578C9.59778 13.3928 9.77444 13.4533 9.83478 13.4615C10.0853 13.4955 10.1989 13.48 10.2754 13.4601C10.376 13.4339 10.4774 13.385 10.7348 13.2508C12.6289 12.2627 13.9193 10.282 13.9193 8.00114C13.9193 4.73345 11.2703 2.08447 8.0026 2.08447Z"
              fill="#996301"
            />
          </g>
          <defs>
            <clipPath id="clip0_1547_98441">
              <rect width="16" height="16" fill="white" />
            </clipPath>
          </defs>
        </svg>
      </Button>
    </div>
  ) : (
    // ToDo: (20240506 - Julian) function not implemented
    <div className="invisible flex h-42px w-full items-center justify-between px-20px">
      {/* Info: (20240506 - Julian) album */}
      <button
        type="button"
        className="flex items-center justify-center rounded-xs border border-secondaryBlue p-10px text-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#clip0_1547_83579)">
            <path
              className="fill-current"
              fillRule="evenodd"
              clipRule="evenodd"
              d="M4.5055 1.2511L4.53594 1.2511H11.4693L11.4997 1.2511C12.0339 1.25109 12.4797 1.25108 12.8439 1.28084C13.2238 1.31188 13.5805 1.37899 13.9177 1.55083C14.4352 1.81448 14.8559 2.23518 15.1195 2.75263C15.2914 3.08989 15.3585 3.44654 15.3895 3.82643C15.4193 4.19067 15.4193 4.63653 15.4193 5.17069V5.2011V10.8011V10.8315C15.4193 11.3657 15.4193 11.8115 15.3895 12.1758C15.3585 12.5557 15.2914 12.9123 15.1195 13.2496C14.8559 13.767 14.4352 14.1877 13.9177 14.4514C13.5805 14.6232 13.2238 14.6903 12.8439 14.7214C12.4797 14.7511 12.0339 14.7511 11.4997 14.7511H11.4693H4.53594H4.50549C3.97134 14.7511 3.5255 14.7511 3.16127 14.7214C2.78138 14.6903 2.42473 14.6232 2.08746 14.4514C1.57002 14.1877 1.14932 13.767 0.88567 13.2496C0.713826 12.9123 0.646715 12.5557 0.615677 12.1758C0.585918 11.8115 0.585927 11.3657 0.585938 10.8315L0.585938 10.8011V5.2011L0.585938 5.17066C0.585927 4.63651 0.585918 4.19066 0.615677 3.82643C0.646715 3.44654 0.713826 3.08989 0.88567 2.75263C1.14932 2.23518 1.57002 1.81448 2.08746 1.55083C2.42473 1.37899 2.78138 1.31188 3.16127 1.28084C3.5255 1.25108 3.97135 1.25109 4.5055 1.2511ZM3.28342 2.77586C2.99629 2.79932 2.85901 2.8412 2.76845 2.88734C2.53325 3.00718 2.34202 3.19841 2.22218 3.43361C2.17604 3.52417 2.13415 3.66145 2.1107 3.94858C2.08652 4.24446 2.08594 4.62867 2.08594 5.2011V10.8011C2.08594 11.3735 2.08652 11.7577 2.1107 12.0536C2.13415 12.3407 2.17604 12.478 2.22218 12.5686C2.31173 12.7443 2.44114 12.8955 2.59897 13.0107L6.71803 8.89168C6.72343 8.88628 6.72883 8.88088 6.73423 8.87548C6.85212 8.75755 6.97019 8.63945 7.07902 8.54706C7.19952 8.44476 7.35706 8.33075 7.56483 8.26325C7.84936 8.1708 8.15585 8.1708 8.44038 8.26325C8.64815 8.33076 8.80569 8.44476 8.9262 8.54706C9.03502 8.63945 9.1531 8.75756 9.27099 8.87549L9.28718 8.89168L9.33594 8.94044L10.718 7.55835L10.7342 7.54216C10.8521 7.42423 10.9702 7.30612 11.079 7.21373C11.1995 7.11143 11.3571 6.99742 11.5648 6.92991C11.8494 6.83746 12.1559 6.83746 12.4404 6.92991C12.6482 6.99742 12.8057 7.11143 12.9262 7.21373C13.035 7.30611 13.1531 7.42422 13.271 7.54215L13.2872 7.55835L13.9193 8.19044V5.2011C13.9193 4.62867 13.9187 4.24446 13.8945 3.94858C13.8711 3.66145 13.8292 3.52417 13.783 3.43361C13.6632 3.19841 13.472 3.00718 13.2368 2.88734C13.1462 2.8412 13.0089 2.79932 12.7218 2.77586C12.4259 2.75168 12.0417 2.7511 11.4693 2.7511H4.53594C3.96351 2.7511 3.5793 2.75168 3.28342 2.77586ZM13.9193 10.3118L12.2265 8.61901C12.1216 8.51405 12.0537 8.44662 12.0026 8.39931C11.9515 8.44662 11.8837 8.51405 11.7787 8.61901L10.3966 10.0011L13.4062 13.0107C13.5641 12.8955 13.6935 12.7443 13.783 12.5686C13.8292 12.478 13.8711 12.3407 13.8945 12.0536C13.9187 11.7577 13.9193 11.3735 13.9193 10.8011V10.3118ZM11.5253 13.2511L8.80615 10.532C8.80597 10.5318 8.80579 10.5316 8.80561 10.5314C8.80543 10.5312 8.80525 10.5311 8.80507 10.5309L8.22652 9.95234L8.75685 9.42201L8.22652 9.95234C8.12156 9.84738 8.05367 9.77995 8.0026 9.73264C7.95154 9.77995 7.88365 9.84738 7.77869 9.95234L4.47993 13.2511C4.4984 13.2511 4.51707 13.2511 4.53594 13.2511H11.4693C11.4881 13.2511 11.5068 13.2511 11.5253 13.2511ZM5.33594 5.41777C5.01377 5.41777 4.7526 5.67893 4.7526 6.0011C4.7526 6.32327 5.01377 6.58443 5.33594 6.58443C5.6581 6.58443 5.91927 6.32327 5.91927 6.0011C5.91927 5.67893 5.6581 5.41777 5.33594 5.41777ZM3.2526 6.0011C3.2526 4.85051 4.18535 3.91777 5.33594 3.91777C6.48653 3.91777 7.41927 4.85051 7.41927 6.0011C7.41927 7.15169 6.48653 8.08443 5.33594 8.08443C4.18535 8.08443 3.2526 7.15169 3.2526 6.0011Z"
              fill="#001840"
            />
          </g>
          <defs>
            <clipPath id="clip0_1547_83579">
              <rect width="16" height="16" fill="white" />
            </clipPath>
          </defs>
        </svg>
      </button>
      <Button className="flex items-center gap-x-4px px-16px py-8px">
        Next <GrLinkNext />
      </Button>
    </div>
  );

  const isDisplayScanner = isModalVisible ? (
    <div className="fixed inset-0 left-0 top-0 z-70 flex h-full w-full items-center justify-center bg-black/50">
      <form
        onSubmit={uploadImage}
        className="relative flex h-fit w-320px flex-col items-center gap-y-16px rounded-sm bg-white py-16px text-navyBlue2"
      >
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
      </form>
    </div>
  ) : null;

  return isDisplayScanner;
};

export default CameraScanner;
