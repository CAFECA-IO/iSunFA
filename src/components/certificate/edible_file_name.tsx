import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { ICertificateUI } from '@/interfaces/certificate';
import { useModalContext } from '@/contexts/modal_context';
import { ToastId } from '@/constants/toast_id';
import { ToastType } from '@/interfaces/toastify';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';

interface EditableFilenameProps {
  certificate: ICertificateUI;
  certificateFilename: string;
  setCertificateFilename: (name: string) => void;
  onUpdateFilename: (certificateId: number, name: string) => void;
}

const EditableFilename: React.FC<EditableFilenameProps> = ({
  certificate,
  certificateFilename,
  setCertificateFilename,
  onUpdateFilename,
}) => {
  const { t } = useTranslation(['certificate']);
  const { toastHandler } = useModalContext();
  const [isNameEditing, setIsNameEditing] = useState(false);
  const [editingBaseName, setEditingBaseName] = useState(''); // Info: (20241213 - tzuhan) 保存編輯中的主檔名
  const { trigger: updateFilename } = APIHandler(APIName.FILE_PUT_V2);

  // Info: (20241213 - tzuhan) 分離檔名與副檔名
  const getBaseAndExtension = (filename: string) => {
    const extensionIndex = filename.lastIndexOf('.');
    return {
      base: extensionIndex !== -1 ? filename.slice(0, extensionIndex) : filename,
      extension: extensionIndex !== -1 ? filename.slice(extensionIndex) : '',
    };
  };

  const { base, extension } = getBaseAndExtension(certificateFilename);

  // Info: (20241213 - tzuhan) 開始編輯模式
  const handleEditName = () => {
    setEditingBaseName(base); // Info: (20241213 - tzuhan) 設定當前主檔名為編輯中的值
    setIsNameEditing(true);
  };

  // Info: (20241213 - tzuhan) 保存檔名
  const handleSaveName = async () => {
    if (editingBaseName.trim() === '' || editingBaseName === base) {
      setIsNameEditing(false);
      return;
    }

    const newFilename = `${editingBaseName}${extension}`; // Info: (20241213 - tzuhan) 拼接完整檔名
    const { success } = await updateFilename({
      params: { fileId: certificate.file.id },
      body: { name: newFilename },
    });

    if (!success) {
      toastHandler({
        id: ToastId.UPDATE_FILENAME_ERROR,
        type: ToastType.ERROR,
        content: t('certificate:ERROR.UPDATE_FILENAME'),
        closeable: true,
      });
      return;
    }

    setCertificateFilename(newFilename); // Info: (20241213 - tzuhan) 更新父層檔名
    onUpdateFilename(certificate.id, newFilename);
    toastHandler({
      id: ToastId.UPDATE_FILENAME_SUCCESS,
      type: ToastType.SUCCESS,
      content: t('certificate:SUCCESS.UPDATE_FILENAME'),
      closeable: true,
    });

    setIsNameEditing(false);
  };

  // Info: (20241213 - tzuhan) 動態計算輸入框寬度
  const calculateInputWidth = (text: string) => {
    const charWidth = text
      .split('')
      .reduce((acc, char) => acc + (/[\u4e00-\u9fa5]/.test(char) ? 2 : 1), 0);
    return `${Math.max(charWidth, 10)}ch`; // Info: (20241213 - tzuhan) 最小寬度為 10ch
  };

  return (
    <div className="flex w-full flex-col items-center">
      <h2 className="flex items-center justify-center gap-2 text-xl font-semibold">
        {isNameEditing ? (
          <input
            id="invoicenname"
            type="text"
            value={editingBaseName}
            onChange={(e) => setEditingBaseName(e.target.value)}
            className="w-auto text-center caret-transparent outline-none placeholder:text-card-text-primary"
            placeholder="|"
            style={{ width: calculateInputWidth(editingBaseName) }}
          />
        ) : (
          <span>{certificateFilename}</span>
        )}
        <div
          className="flex h-8 w-8 cursor-pointer items-center justify-center"
          onClick={isNameEditing ? handleSaveName : handleEditName}
        >
          <Image
            alt={isNameEditing ? 'save' : 'edit'}
            src={isNameEditing ? '/icons/save.svg' : '/elements/edit.svg'}
            width={20}
            height={20}
          />
        </div>
      </h2>
      <p className="text-xs text-card-text-secondary">{t('certificate:EDIT.HEADER')}</p>
    </div>
  );
};

export default EditableFilename;
