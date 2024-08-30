import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { RxCross2 } from 'react-icons/rx';
import { useTranslation } from 'next-i18next';
import { Button } from '@/components/button/button';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
// eslint-disable-next-line import/no-cycle
import { useGlobalCtx } from '@/contexts/global_context';
import { useUserCtx } from '@/contexts/user_context';
import { FREE_COMPANY_ID, NON_EXISTING_COMPANY_ID } from '@/constants/config';
import { MessageType } from '@/interfaces/message_modal';
import { UploadType } from '@/constants/file';
import { IFile } from '@/interfaces/file';

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
  const { t } = useTranslation([
    'common',
    'project',
    'journal',
    'kyc',
    'report_401',
    'salary',
    'setting',
    'terms',
  ]);
  const router = useRouter();
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

  const { selectedCompany, userAuth } = useUserCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler } = useGlobalCtx();

  // Info: (20240801 - Julian) 上傳圖片 API
  const {
    trigger: uploadImage,
    success,
    code,
  } = APIHandler<IFile>(APIName.FILE_UPLOAD, {}, false, false);

  const modalTitle =
    uploadType === UploadType.USER
      ? t('common:PROFILE_UPLOAD_MODAL.PROFILE_PIC')
      : uploadType === UploadType.COMPANY
        ? t('common:PROFILE_UPLOAD_MODAL.COMPANY_IMAGE')
        : t('common:PROFILE_UPLOAD_MODAL.PROJECT_IMAGE');

  const modalDescription =
    uploadType === UploadType.USER
      ? t('common:PROFILE_UPLOAD_MODAL.PLEASE_UPLOAD_YOUR_PROFILE_PICTURE')
      : uploadType === UploadType.COMPANY
        ? t('common:PROFILE_UPLOAD_MODAL.PLEASE_UPLOAD_YOUR_COMPANY_PICTURE')
        : t('common:PROFILE_UPLOAD_MODAL.PLEASE_UPLOAD_YOUR_PROJECT_PICTURE');

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
      title: t('common:PROFILE_UPLOAD_MODAL.UPLOAD_FAILED'),
      content: `${t('common:PROFILE_UPLOAD_MODAL.PLEASE_TRY_LATER')} ${code}`,
      submitBtnStr: t('project:PROJECT.OK'),
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
        const companyId = selectedCompany?.id ?? NON_EXISTING_COMPANY_ID;
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
        companyId: selectedCompany?.id ?? FREE_COMPANY_ID,
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
    // eslint-disable-next-line jsx-a11y/label-has-associated-control
    <label
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
        {t('common:PROFILE_UPLOAD_MODAL.DROP_YOUR_FILES_HERE_OR')}{' '}
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
          {t('report_401:REPORTS_HISTORY_LIST.CANCEL')}
        </Button>
        <Button type="button" className="w-full" variant="tertiary" onClick={saveImage}>
          <p>{t('common:EDIT_BOOKMARK_MODAL.SAVE')}</p>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className="fill-current"
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12.8594 3.27637C12.774 3.25586 12.6746 3.25104 12.2312 3.25104H6.58577V5.33438C6.58577 5.58011 6.58636 5.7193 6.59464 5.82064C6.59725 5.85262 6.60017 5.87275 6.60214 5.88398C6.60704 5.89059 6.61289 5.89644 6.61951 5.90134C6.63074 5.90332 6.65086 5.90624 6.68285 5.90885C6.78419 5.91713 6.92338 5.91771 7.16911 5.91771H12.8358C13.0815 5.91771 13.2207 5.91713 13.322 5.90885C13.354 5.90623 13.3741 5.90332 13.3854 5.90134C13.392 5.89644 13.3978 5.89059 13.4027 5.88398C13.4047 5.87275 13.4076 5.85262 13.4102 5.82064C13.4185 5.7193 13.4191 5.58011 13.4191 5.33438V3.64607C13.2421 3.47187 13.1836 3.42243 13.1244 3.38612C13.0424 3.33586 12.9529 3.29883 12.8594 3.27637ZM14.9191 5.14504V5.33438L14.9191 5.35919C14.9191 5.57112 14.9192 5.77282 14.9053 5.94278C14.8901 6.12812 14.8548 6.34072 14.7465 6.5532C14.5947 6.85112 14.3525 7.09334 14.0546 7.24514C13.8421 7.3534 13.6295 7.38872 13.4442 7.40387C13.2742 7.41775 13.0725 7.41773 12.8606 7.41771L12.8358 7.41771H7.16911C7.16083 7.41771 7.15256 7.41771 7.14431 7.41771C6.93238 7.41773 6.73067 7.41775 6.5607 7.40387C6.37536 7.38872 6.16277 7.3534 5.95029 7.24514C5.65237 7.09334 5.41015 6.85112 5.25835 6.5532C5.15008 6.34072 5.11476 6.12812 5.09962 5.94278C5.08573 5.77281 5.08575 5.57111 5.08577 5.35917C5.08577 5.35092 5.08578 5.34266 5.08578 5.33438V3.27141C5.02871 3.27461 4.97406 3.27832 4.92152 3.28261C4.55102 3.31289 4.352 3.36839 4.20796 3.44178C3.87867 3.60956 3.61096 3.87728 3.44318 4.20656C3.36979 4.3506 3.31428 4.54962 3.28401 4.92012C3.25303 5.29938 3.25244 5.7886 3.25244 6.50104V13.501C3.25244 14.2135 3.25303 14.7027 3.28401 15.082C3.31428 15.4525 3.36979 15.6515 3.44318 15.7955C3.61096 16.1248 3.87868 16.3925 4.20796 16.5603C4.352 16.6337 4.55102 16.6892 4.92152 16.7195C4.97406 16.7238 5.02871 16.7275 5.08578 16.7307V12.1677L5.08577 12.1429C5.08575 11.931 5.08573 11.7293 5.09962 11.5593C5.11476 11.374 5.15008 11.1614 5.25835 10.9489C5.41015 10.651 5.65237 10.4087 5.95029 10.257C6.16277 10.1487 6.37536 10.1134 6.5607 10.0982C6.73067 10.0843 6.93238 10.0844 7.14431 10.0844L7.16911 10.0844H12.8358L12.8606 10.0844C13.0725 10.0844 13.2742 10.0843 13.4442 10.0982C13.6295 10.1134 13.8421 10.1487 14.0546 10.257C14.3525 10.4087 14.5947 10.651 14.7465 10.9489C14.8548 11.1614 14.8901 11.374 14.9053 11.5593C14.9192 11.7293 14.9191 11.931 14.9191 12.1429L14.9191 12.1677V16.7307C14.9762 16.7275 15.0308 16.7238 15.0834 16.7195C15.4539 16.6892 15.6529 16.6337 15.7969 16.5603C16.1262 16.3925 16.3939 16.1248 16.5617 15.7955C16.6351 15.6515 16.6906 15.4525 16.7209 15.082C16.7519 14.7027 16.7524 14.2135 16.7524 13.501V7.77228C16.7524 7.32893 16.7476 7.2295 16.7271 7.14408C16.7047 7.05054 16.6676 6.96113 16.6174 6.87911C16.5715 6.80421 16.5046 6.73049 16.1911 6.41699L14.9191 5.14504ZM14.2207 18.2493C14.5941 18.2462 14.9207 18.2378 15.2055 18.2145C15.6688 18.1766 16.0872 18.0959 16.4779 17.8968C17.0894 17.5852 17.5866 17.088 17.8982 16.4765C18.0973 16.0858 18.178 15.6674 18.2159 15.2041C18.2525 14.7565 18.2525 14.2058 18.2524 13.5324V13.501V7.77228C18.2524 7.74999 18.2525 7.72794 18.2525 7.70609C18.2527 7.36343 18.253 7.07424 18.1857 6.79391C18.1265 6.54732 18.0288 6.31159 17.8963 6.09536C17.7457 5.84954 17.541 5.64522 17.2985 5.40311C17.2831 5.38768 17.2675 5.37209 17.2517 5.35633L14.6472 2.75176C14.6314 2.736 14.6158 2.72039 14.6004 2.70494C14.3583 2.46245 14.1539 2.2578 13.9081 2.10716C13.6919 1.97466 13.4562 1.87702 13.2096 1.81782C12.9292 1.75051 12.6401 1.75074 12.2974 1.75101C12.2756 1.75103 12.2535 1.75104 12.2312 1.75104H6.50244L6.47102 1.75104C6.26121 1.75104 6.0633 1.75104 5.87672 1.75214C5.86316 1.75141 5.84951 1.75104 5.83578 1.75104C5.81842 1.75104 5.8012 1.75163 5.78414 1.75279C5.41076 1.75587 5.08418 1.76433 4.79937 1.7876C4.33611 1.82545 3.91771 1.90618 3.52697 2.10527C2.91545 2.41686 2.41826 2.91405 2.10667 3.52558C1.90758 3.91632 1.82684 4.33471 1.78899 4.79798C1.75243 5.24554 1.75243 5.79625 1.75244 6.46963L1.75244 6.50104V13.501L1.75244 13.5325C1.75243 14.2058 1.75243 14.7565 1.78899 15.2041C1.82684 15.6674 1.90758 16.0858 2.10667 16.4765C2.41826 17.088 2.91545 17.5852 3.52697 17.8968C3.91771 18.0959 4.33611 18.1766 4.79937 18.2145C5.08418 18.2378 5.41076 18.2462 5.78414 18.2493C5.8012 18.2505 5.81842 18.251 5.83578 18.251C5.84951 18.251 5.86317 18.2507 5.87672 18.2499C6.06332 18.2511 6.26123 18.251 6.47105 18.251H6.50244H13.5024H13.5338C13.7437 18.251 13.9416 18.2511 14.1282 18.2499C14.1417 18.2507 14.1554 18.251 14.1691 18.251C14.1865 18.251 14.2037 18.2505 14.2207 18.2493ZM13.4191 16.751V12.1677C13.4191 11.922 13.4185 11.7828 13.4102 11.6815C13.4076 11.6495 13.4047 11.6293 13.4027 11.6181C13.3978 11.6115 13.392 11.6056 13.3854 11.6007C13.3741 11.5988 13.354 11.5959 13.322 11.5932C13.2207 11.585 13.0815 11.5844 12.8358 11.5844H7.16911C6.92338 11.5844 6.78419 11.585 6.68285 11.5932C6.65086 11.5959 6.63074 11.5988 6.61951 11.6007C6.61289 11.6056 6.60704 11.6115 6.60214 11.6181C6.60017 11.6293 6.59725 11.6495 6.59464 11.6815C6.58636 11.7828 6.58577 11.922 6.58577 12.1677V16.751H13.4191Z"
              fill="#996301"
            />
          </svg>
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
