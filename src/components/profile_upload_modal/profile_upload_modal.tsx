import Image from 'next/image';
import { RxCross2 } from 'react-icons/rx';

interface IProfileUploadModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const ProfileUploadModal = ({
  isModalVisible,
  modalVisibilityHandler,
}: IProfileUploadModalProps) => {
  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div
        className={`relative flex h-400px w-90vw flex-col gap-20px rounded-xs bg-white p-16px md:w-400px`}
      >
        <button
          type="button"
          onClick={modalVisibilityHandler}
          className="absolute right-12px top-12px text-lightGray5"
        >
          <RxCross2 size={20} />
        </button>
        {/* Info: (20240617 - Julian) Header */}
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-bold text-card-text-primary">Profile Pic</h1>
          <p className="text-xs text-card-text-secondary">Please upload your profile picture</p>
        </div>
        {/* Info: (20240617 - Julian) Body */}
        <div className="flex flex-1 items-center justify-center">
          {/* Info: (20240617 - Julian) Upload area */}
          <div className="flex flex-col items-center justify-center pb-40px">
            <Image src="/icons/upload_file.svg" width={55} height={60} alt="upload_file" />
            <p className="mt-20px font-semibold text-navyBlue2">
              Drop your files here or <span className="text-darkBlue">Browse</span>
            </p>
            <p className="text-center text-lightGray4">Maximum size: 50MB</p>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default ProfileUploadModal;
