import Image from 'next/image';
import { useRef, useState } from 'react';
import { RxCross2 } from 'react-icons/rx';
import { PiCameraLight } from 'react-icons/pi';
import { GrLinkNext } from 'react-icons/gr';
import { Button } from '../button/button';

const CameraScanner = () => {
  const [visibleScanner, setVisibleScanner] = useState(false);

  const cameraRef = useRef<HTMLVideoElement>(null);

  const handleOpenCamera = () => {
    setVisibleScanner(true);
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: 320,
          height: 356,
          deviceId: 'default',
          facingMode: 'user',
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
    setVisibleScanner(false);
    const video = cameraRef.current;
    if (video && video.srcObject && video.srcObject instanceof MediaStream) {
      video.srcObject.getTracks().forEach((track) => {
        track.stop();
      });

      video.srcObject = null;
    }
  };

  const isDisplayScanner = visibleScanner ? (
    <div className="bg-opacity/50 fixed inset-0 left-0 top-0 z-70 flex h-full w-full items-center justify-center bg-black">
      <div className="relative flex h-fit w-320px flex-col items-center gap-y-16px rounded-sm bg-white py-16px text-navyBlue2">
        {/* Info: (20240506 - Julian) title */}
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-bold">Camera Scanner</h1>
          <p className="text-xs text-lightGray5">Please align the files in the shooting area.</p>
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
        <video ref={cameraRef} className="relative">
          <track kind="captions" />
        </video>
        {/* Info: (20240506 - Julian) function buttons */}
        <div className="flex w-full flex-col items-center gap-32px">
          {/* Info: (20240506 - Julian) shutter */}
          <button type="button" className="text-secondaryBlue hover:text-primaryYellow">
            <PiCameraLight size={30} />
          </button>
          <div className="flex w-full items-center justify-between px-20px">
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
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Info: (20240506 - Julian) Camera Scanner */}
      {isDisplayScanner}
      {/* Info: (20240506 - Julian) Button */}
      <button
        type="button"
        onClick={handleOpenCamera}
        className="flex h-200px w-300px flex-col items-center justify-center rounded-lg border border-dashed border-lightGray6 bg-white p-24px md:h-240px md:w-auto md:flex-1 md:p-48px"
      >
        <Image src="/icons/scan_qrcode.svg" width={55} height={60} alt="scan_qr_code" />
        <div className="mt-20px flex items-center gap-10px">
          <Image src="/icons/scan.svg" width={20} height={20} alt="scan" />
          <p className="font-semibold text-navyBlue2">
            Use Your Phone as <span className="text-primaryYellow">Scanner</span>
          </p>
        </div>
        <p className="text-center text-lightGray4">
          Please scan the QRcode to start scanning with your phone
        </p>
      </button>
    </>
  );
};

export default CameraScanner;
