import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { RxCross2 } from 'react-icons/rx';
import { useTranslation } from 'next-i18next';
import { Button } from '@/components/button/button';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useModalContext } from '@/contexts/modal_context';
import { useUserCtx } from '@/contexts/user_context';
import { FREE_ACCOUNT_BOOK_ID, NON_EXISTING_ACCOUNT_BOOK_ID } from '@/constants/config';
import { MessageType } from '@/interfaces/message_modal';
import { UploadType } from '@/constants/file';
import { IFile } from '@/interfaces/file';
import { BiSave } from 'react-icons/bi';

interface IProfileUploadModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
  uploadType: UploadType;
}

const ProfileUploadModal = ({
  isModalVisible,
  modalVisibilityHandler,
  uploadType,
}: IProfileUploadModalProps) => {
  const { t } = useTranslation(['alpha', 'journal']);
  const router = useRouter();
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

  const { connectedAccountBook, userAuth } = useUserCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler } = useModalContext();

  // Info: (20240801 - Julian) 上傳圖片 API
  const {
    trigger: uploadImage,
    success,
    code,
  } = APIHandler<IFile>(APIName.FILE_UPLOAD, {}, false, false);

  const modalTitle =
    uploadType === UploadType.USER
      ? t('alpha:PROFILE_UPLOAD_MODAL.PROFILE_PIC')
      : uploadType === UploadType.COMPANY
        ? t('alpha:PROFILE_UPLOAD_MODAL.COMPANY_IMAGE')
        : t('alpha:PROFILE_UPLOAD_MODAL.PROJECT_IMAGE');

  const modalDescription =
    uploadType === UploadType.USER
      ? t('alpha:PROFILE_UPLOAD_MODAL.PLEASE_UPLOAD_YOUR_PROFILE_PICTURE')
      : uploadType === UploadType.COMPANY
        ? t('alpha:PROFILE_UPLOAD_MODAL.PLEASE_UPLOAD_YOUR_COMPANY_PICTURE')
        : t('alpha:PROFILE_UPLOAD_MODAL.PLEASE_UPLOAD_YOUR_PROJECT_PICTURE');

  const cancelHandler = () => {
    setUploadedImage(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  };

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    // Info: (20240618 - Julian) 須檢查是否為圖檔
    if (file && file.type.includes('image')) {
      setUploadedImage(file);
    }
  };

  const printImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const file = event.target.files?.[0];
    if (file) {
      setUploadedImage(file);
    }
  };

  // Info: (20240801 - Julian) 上傳失敗 -> 顯示錯誤訊息
  const uploadedError = () => {
    messageModalDataHandler({
      messageType: MessageType.ERROR,
      title: t('alpha:PROFILE_UPLOAD_MODAL.UPLOAD_FAILED'),
      content: `${t('alpha:PROFILE_UPLOAD_MODAL.PLEASE_TRY_LATER')} ${code}`,
      submitBtnStr: t('alpha:PROFILE_UPLOAD_MODAL.OK'),
      submitBtnFunction: messageModalVisibilityHandler,
    });
    messageModalVisibilityHandler();
  };

  // Info: (20240801 - Julian) 上傳成功 -> 清空 uploadedImage 並關閉 Modal
  const uploadedSuccess = () => {
    setUploadedImage(null);
    setUploadSuccess(true);
  };

  // Info: (20240801 - Julian) --------------- API Functions ---------------
  const saveImage = async () => {
    // Info: (20240801 - Julian) 建立 FormData
    const formData = new FormData();
    let targetId = '';
    switch (uploadType) {
      // Info: (20240801 - Julian) 上傳公司圖片
      case UploadType.COMPANY: {
        const companyId = connectedAccountBook?.id ?? NON_EXISTING_ACCOUNT_BOOK_ID;
        targetId = companyId.toString();

        formData.append('file', uploadedImage as File);
        break;
      }
      // Info: (20240801 - Julian) 上傳用戶頭貼
      case UploadType.USER: {
        const userId = userAuth?.id ?? -1;
        targetId = userId.toString();

        formData.append('file', uploadedImage as File);
        break;
      }
      // Info: (20240801 - Julian) 上傳專案圖片
      case UploadType.PROJECT: {
        targetId = '-1'; // ToDo: (20240801 - Julian) [Beta] get project id

        formData.append('file', uploadedImage as File);
        break;
      }
      default:
        break;
    }
    // Info: (20240801 - Julian) call API
    await uploadImage({
      params: {
        companyId: connectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID,
      },
      query: {
        type: uploadType,
        targetId,
      },
      body: formData,
    });
  };

  useEffect(() => {
    if (!isModalVisible) {
      setUploadedImage(null);
      setUploadSuccess(false);
    }
  }, [isModalVisible]);

  useEffect(() => {
    if (uploadSuccess) {
      modalVisibilityHandler();
      router.reload();
    }
  }, [uploadSuccess]);

  useEffect(() => {
    if (success) {
      uploadedSuccess();
    } else if (code) {
      uploadedError();
    }
  }, [success, code]);

  const uploadArea = (
    <label
      htmlFor="file"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex h-300px w-full flex-col items-center justify-center pb-30px hover:cursor-pointer"
    >
      <input
        type="file"
        name="file"
        className="hidden"
        accept="image/*"
        onChange={(event) => printImage(event)}
      />
      <Image src="/icons/upload_file.svg" width={55} height={60} alt="upload_file" />
      <p className="mt-20px font-semibold text-drag-n-drop-text-primary">
        {t('alpha:PROFILE_UPLOAD_MODAL.DROP_YOUR_FILES_HERE_OR')}{' '}
        <span className="text-link-text-primary">{t('journal:JOURNAL.BROWSE')}</span>
      </p>
      <p className="text-center text-drag-n-drop-text-note">{t('journal:JOURNAL.MAXIMUM_SIZE')}</p>
    </label>
  );

  const overview = uploadedImage ? (
    // Info: (20240618 - Julian) 圖檔預覽
    <div className="flex w-full flex-col items-center gap-20px">
      <div className="relative flex h-330px w-330px items-center justify-center md:h-400px md:w-400px">
        <Image
          src={URL.createObjectURL(uploadedImage)}
          alt="preview"
          fill
          style={{ objectFit: 'contain' }}
        />
        {/* Info: (20240618 - Julian) spotlight */}
        <div className="absolute block h-full w-full bg-spotlight"></div>
      </div>
      {/* Info: (20240618 - Julian) Buttons */}
      <div className="ml-auto flex items-center gap-12px px-20px py-16px text-button-text-secondary">
        <Button type="button" variant="secondaryBorderless" onClick={cancelHandler}>
          {t('alpha:PROFILE_UPLOAD_MODAL.CANCEL')}
        </Button>
        <Button type="button" className="w-full" variant="tertiary" onClick={saveImage}>
          <p>{t('alpha:EDIT_BOOKMARK_MODAL.SAVE')}</p>
          <BiSave size={20} />
        </Button>
      </div>
    </div>
  ) : (
    uploadArea
  );

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 font-barlow">
      <div className={`relative flex w-330px flex-col gap-20px rounded-xs bg-white md:w-400px`}>
        <button
          type="button"
          onClick={modalVisibilityHandler}
          className="absolute right-12px top-12px text-icon-surface-single-color-primary"
        >
          <RxCross2 size={20} />
        </button>
        {/* Info: (20240617 - Julian) Header */}
        <div className="flex flex-col items-center p-16px">
          <h1 className="text-xl font-bold text-card-text-primary">{modalTitle}</h1>
          <p className="text-xs text-card-text-secondary">{modalDescription}</p>
        </div>
        {/* Info: (20240617 - Julian) Body */}
        <div className="flex items-center justify-center">{overview}</div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default ProfileUploadModal;
