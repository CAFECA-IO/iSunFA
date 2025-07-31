import fs from 'fs/promises';
import { NextApiRequest, NextApiResponse } from 'next';
import { UPLOAD_TYPE_TO_FOLDER_MAP, UploadType, FileFolder } from '@/constants/file';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IFileBeta } from '@/interfaces/file';
import { parseForm } from '@/lib/utils/parse_image_form';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { uploadFile } from '@/lib/utils/google_image_upload';
import { getCompanyById, updateCompanyById } from '@/lib/utils/repo/account_book.repo';
import { updateUserById } from '@/lib/utils/repo/user.repo';
import { updateProjectById } from '@/lib/utils/repo/project.repo';
import { updateTeamIcon } from '@/lib/utils/repo/team.repo';
import formidable from 'formidable';
import loggerBack from '@/lib/utils/logger_back';
import { createFile, putFileById } from '@/lib/utils/repo/file.repo';
import { generateFilePathWithBaseUrlPlaceholder } from '@/lib/utils/file';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { roomManager } from '@/lib/utils/room';
import { getPusherInstance } from '@/lib/utils/pusher';
import { PRIVATE_CHANNEL, ROOM_EVENT } from '@/constants/pusher';
import { parseJsonWebKeyFromString } from '@/lib/utils/formatter/json_web_key.formatter';
import {
  decryptFile,
  encryptFile,
  getPrivateKeyByCompany,
  getPublicKeyByCompany,
  uint8ArrayToBuffer,
} from '@/lib/utils/crypto';
import { getSession } from '@/lib/utils/session';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';
import { HTTP_STATUS } from '@/constants/http';
import { generatePDFThumbnail } from '@/lib/utils/pdf_thumbnail';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handleFileUpload(
  type: UploadType | undefined,
  file: formidable.File[],
  targetId: string | undefined,
  isEncrypted: boolean,
  encryptedSymmetricKey: string,
  iv: Uint8Array
) {
  const fileForSave = file[0];
  const fileName = fileForSave.newFilename;
  const fileMimeType = fileForSave.mimetype || 'image/jpeg';
  const fileSize = fileForSave.size;
  const targetIdNum = targetId && type !== UploadType.ROOM ? convertStringToNumber(targetId) : -1;
  let fileUrl = '';

  // Info: (20250522 - Shirley) 處理未指定類型的情況，直接上傳到 Google Storage
  if (!type) {
    const googleBucketUrl = await uploadFile(fileForSave);
    fileUrl = googleBucketUrl;
  } else {
    // Info: (20250522 - Shirley) 原有的 switch 邏輯
    switch (type) {
      case UploadType.KYC:
      case UploadType.INVOICE:
      case UploadType.ROOM: {
        const localUrl = generateFilePathWithBaseUrlPlaceholder(
          fileName,
          UPLOAD_TYPE_TO_FOLDER_MAP[type]
        );
        fileUrl = localUrl || '';
        break;
      }
      case UploadType.COMPANY:
      case UploadType.USER:
      case UploadType.PROJECT:
      case UploadType.TEAM: {
        const googleBucketUrl = await uploadFile(fileForSave);
        fileUrl = googleBucketUrl;
        break;
      }
      default:
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
    }
  }
  const ivBuffer = uint8ArrayToBuffer(iv);

  // Info: (20250522 - Shirley) 使用 FileFolder.TMP 作為默認類型
  const fileType = type ? UPLOAD_TYPE_TO_FOLDER_MAP[type] || FileFolder.TMP : FileFolder.TMP;

  const fileInDB = await createFile({
    name: fileName,
    size: fileSize,
    mimeType: fileMimeType,
    type: fileType,
    url: fileUrl,
    isEncrypted,
    encryptedSymmetricKey,
    iv: ivBuffer,
  });

  if (!fileInDB) {
    throw new Error(STATUS_MESSAGE.FAILED_TO_SAVE_FILE);
  }

  let thumbnailInfo = null;
  let pdfPath = fileForSave.filepath;
  let tempDecryptedPath = '';
  if (type === UploadType.INVOICE && fileMimeType === 'application/pdf') {
    // Info: (20250513 - Shirley) Decrypt PDF file if it's encrypted
    if (isEncrypted) {
      // Info: (20250513 - Shirley) 獲取公司ID和私鑰
      const companyId = convertStringToNumber(targetId);
      // ToDo: (20250710 - Luphia) Use IPFS to store files (S1: 上傳檔案（加密）)
      const encryptedFileBuffer = await fs.readFile(fileForSave.filepath);
      const arrayBuffer = new Uint8Array(encryptedFileBuffer).buffer;
      const privateKey = await getPrivateKeyByCompany(companyId);

      if (!privateKey) {
        throw new Error('Private key not found for decryption');
      }

      // Info: (20250513 - Shirley) 解密檔案
      const ivUint8Array = new Uint8Array(ivBuffer);
      const decryptedBuffer = await decryptFile(
        arrayBuffer,
        encryptedSymmetricKey,
        privateKey,
        ivUint8Array
      );

      // Info: (20250513 - Shirley) 寫入臨時解密檔案
      tempDecryptedPath = `${fileForSave.filepath.replace(/\.[^/.]+$/, '')}_decrypted.pdf`;
      // ToDo: (20250710 - Luphia) Use IPFS to store files (S1: 解密暫存、後續產縮圖)
      await fs.writeFile(tempDecryptedPath, Buffer.from(decryptedBuffer));
      pdfPath = tempDecryptedPath;
    }

    // Info: (20250513 - Shirley) generate PDF thumbnail
    try {
      thumbnailInfo = await generatePDFThumbnail(pdfPath, {
        removeString: '_decrypted',
        suffix: '_thumbnail',
      });

      if (!thumbnailInfo.success) {
        loggerBack.error('Failed to generate PDF thumbnail');
      }
    } catch (error) {
      loggerBack.error(error, 'Error generating PDF thumbnail');
    }
  }

  // Info: (20250513 - Shirley) If we have a thumbnail, process it with the same encryption parameters
  if (thumbnailInfo && thumbnailInfo.success) {
    const thumbnailFileName = path.basename(thumbnailInfo.filepath);
    const thumbnailUrl = generateFilePathWithBaseUrlPlaceholder(thumbnailFileName, fileType);

    // ToDo: (20250710 - Luphia) Use IPFS to store files (S1: 刪除暫存檔)
    // Info: (20250513 - Shirley) Remove the decrypted PDF file after thumbnail generation
    fs.unlink(tempDecryptedPath);
    if (isEncrypted) {
      try {
        // Info: (20250513 - Shirley) 加密 thumbnail 之後存到 DB
        const companyId = convertStringToNumber(targetId);
        // ToDo: (20250710 - Luphia) Use IPFS to store files (S1: 讀縮圖)
        const thumbnailBuffer = await fs.readFile(thumbnailInfo.filepath);

        const publicKey = await getPublicKeyByCompany(companyId);

        if (!publicKey) {
          throw new Error('Public key not found for encryption');
        }

        // Info: (20250513 - Shirley) 使用全新的 IV 參數，而非重用原始文件的 IV
        const newIv = crypto.getRandomValues(new Uint8Array(iv.length));

        // Info: (20250513 - Shirley) 執行加密 - 使用全新的 IV
        const { encryptedContent, encryptedSymmetricKey: thumbnailEncryptedKey } =
          await encryptFile(
            new Uint8Array(thumbnailBuffer).buffer as ArrayBuffer,
            publicKey,
            newIv
          );

        // Info: (20250513 - Shirley) 驗證加密後的內容
        if (!encryptedContent) {
          loggerBack.error('Failed to encrypt thumbnail - encryptedContent is null or empty');
        }

        // Info: (20250513 - Shirley) 寫入加密縮略圖
        const encryptedThumbnailPath = `${thumbnailInfo.filepath}`;
        // ToDo: (20250710 - Luphia) Use IPFS to store files (S1: 寫加密縮圖)
        await fs.writeFile(encryptedThumbnailPath, Buffer.from(encryptedContent));

        // Info: (20250513 - Shirley) 將新的 IV 轉換為 Buffer 以存儲在數據庫中
        const newIvBuffer = uint8ArrayToBuffer(newIv);

        // Info: (20250513 - Shirley) 創建文件記錄 - 使用新的 IV 和對稱密鑰
        const thumbnailInDB = await createFile({
          name: thumbnailFileName,
          size: thumbnailInfo.size,
          mimeType: 'image/png',
          type: fileType,
          url: thumbnailUrl,
          isEncrypted,
          encryptedSymmetricKey: thumbnailEncryptedKey,
          iv: newIvBuffer,
        });

        if (thumbnailInDB && fileInDB) {
          // Info: (20250513 - Shirley) 更新原始文件記錄，添加縮略圖 ID
          await putFileById(fileInDB.id, {
            thumbnailId: thumbnailInDB.id,
          });
          loggerBack.info(
            `Associated thumbnail ID ${thumbnailInDB.id} with file ID ${fileInDB.id}`
          );
        }
      } catch (encryptionError) {
        // Info: (20250513 - Shirley) 記錄縮略圖加密過程中的錯誤
        loggerBack.error(
          encryptionError,
          `Error during thumbnail encryption for ${thumbnailFileName}`
        );

        // Info: (20250513 - Shirley) 創建未加密的縮略圖記錄作為後備方案
        loggerBack.info(
          `Creating unencrypted thumbnail record as fallback due to encryption error`
        );

        const thumbnailInDB = await createFile({
          name: thumbnailFileName,
          size: thumbnailInfo.size,
          mimeType: 'image/png',
          type: fileType,
          url: thumbnailUrl,
          isEncrypted: false, // Info: (20250513 - Shirley) 設置為未加密
          encryptedSymmetricKey: '', // Info: (20250513 - Shirley) 加空字符串作為必需參數
          iv: Buffer.from([]), // Info: (20250513 - Shirley) 加空 Buffer 作為必需參數
        });

        if (thumbnailInDB && fileInDB) {
          await putFileById(fileInDB.id, {
            thumbnailId: thumbnailInDB.id,
          });
        }
      }
    } else {
      // Info: (20250513 - Shirley) Create unencrypted thumbnail record with the same encryption parameters
      const thumbnailInDB = await createFile({
        name: thumbnailFileName,
        size: thumbnailInfo.size,
        mimeType: 'image/png',
        type: fileType,
        url: thumbnailUrl,
        isEncrypted,
        encryptedSymmetricKey,
        iv: ivBuffer,
      });

      if (thumbnailInDB && fileInDB) {
        // Info: (20250513 - Shirley) Update original file record with thumbnail ID
        await putFileById(fileInDB.id, {
          thumbnailId: thumbnailInDB.id,
        });
      }
    }
  }

  const fileId = fileInDB.id;
  const returnFile: IFileBeta = {
    id: fileId,
    name: fileName,
    size: fileSize,
    url: `/image/${fileId}`,
    existed: true,
  };

  // Info: (20250513 - Shirley) 如果有縮略圖，將其添加到返回對象中
  if (fileInDB.thumbnailId) {
    returnFile.thumbnail = {
      id: fileInDB.thumbnailId,
      name: fileName.replace('.pdf', '_thumbnail.png'),
      size: thumbnailInfo?.size || 0,
      url: `/image/${fileInDB.thumbnailId}`,
      existed: true,
    };
  }

  // Info: (20250522 - Shirley) 只有在指定了 type 和 targetId 的情況下才執行實體關聯
  if (type && targetId) {
    switch (type) {
      case UploadType.COMPANY: {
        await updateCompanyById(targetIdNum, undefined, undefined, fileId);
        break;
      }
      case UploadType.USER: {
        await updateUserById(targetIdNum, undefined, undefined, fileId);
        break;
      }
      case UploadType.PROJECT: {
        await updateProjectById(targetIdNum, undefined, fileId);
        break;
      }
      case UploadType.TEAM: {
        await updateTeamIcon(targetIdNum, fileId);
        break;
      }
      case UploadType.KYC:
      case UploadType.ROOM: {
        roomManager.addFileToRoom(targetId, returnFile);
        // Info: (20241121 - tzuhan)這是 FILE_UPLOAD 成功後，後端使用 pusher 的傳送 ROOM_EVENT.NEW_FILE 的範例
        /**
         * ROOM_EVENT.NEW_FILE 傳送的資料格式為 { message: string }, 其中 string 為 JSON.stringify(file as IFileBeta)
         */
        const pusher = getPusherInstance();
        pusher.trigger(`${PRIVATE_CHANNEL.ROOM}-${targetId}`, ROOM_EVENT.NEW_FILE, {
          message: JSON.stringify(returnFile),
        });
        break;
      }
      case UploadType.INVOICE: {
        break;
      }
      default:
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
    }
  }

  return returnFile;
}

function extractKeyAndIvFromFields(fields: formidable.Fields) {
  const { encryptedSymmetricKey, iv, publicKey } = fields;
  const keyStr =
    encryptedSymmetricKey && encryptedSymmetricKey.length ? encryptedSymmetricKey[0] : '';
  const ivStr = iv ? iv[0] : '';

  const ivUnit8: Uint8Array = new Uint8Array(ivStr.split(',').map((num) => parseInt(num, 10)));

  const isEncrypted = !!(keyStr && ivUnit8.length > 0);

  const publicKeyStr = publicKey ? publicKey[0] : '';
  const jsonPublicKey: JsonWebKey | null = publicKeyStr
    ? parseJsonWebKeyFromString(publicKeyStr)
    : null;

  return {
    isEncrypted,
    encryptedSymmetricKey: keyStr,
    iv: ivUnit8,
    publicKey: jsonPublicKey,
  };
}

const handlePostRequest = async (req: NextApiRequest) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFileBeta | null = null;

  const session = await getSession(req);
  const { teams } = session;

  await checkSessionUser(session, APIName.FILE_UPLOAD, req);
  await checkUserAuthorization(APIName.FILE_UPLOAD, req, session);

  const { query } = checkRequestData(APIName.FILE_UPLOAD, req, session);
  // Info: (20250522 - Shirley) type 和 targetId 都是可選的
  const type = query?.type as UploadType | undefined;
  const targetId = query?.targetId;

  // Info: (20250522 - Shirley) 只有當同時提供 type 和 targetId 時才進行權限檢查
  if (type && targetId) {
    if (type === UploadType.TEAM) {
      // Info: (20250522 - Shirley) 現有的團隊權限檢查
      const userTeam = teams?.find((team) => team.id === +targetId);
      if (!userTeam) {
        loggerBack.warn(`User is not in team ${targetId}`);
        statusMessage = STATUS_MESSAGE.FORBIDDEN;
        return { response: formatApiResponse(statusMessage, null), statusMessage };
      }
      const assertResult = convertTeamRoleCanDo({
        teamRole: userTeam.role as TeamRole,
        canDo: TeamPermissionAction.MODIFY_IMAGE,
      });

      if (!assertResult.can) {
        loggerBack.warn(
          `User with role ${userTeam.role} doesn't have permission to modify team icon`
        );
        statusMessage = STATUS_MESSAGE.FORBIDDEN;
        return { response: formatApiResponse(statusMessage, null), statusMessage };
      }
    } else if (type === UploadType.COMPANY) {
      // Info: (20250522 - Shirley) 現有的公司權限檢查
      const company = await getCompanyById(+targetId);
      if (!company) {
        statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
        return { response: formatApiResponse(statusMessage, null), statusMessage };
      }

      const { teamId: companyTeamId } = company;
      if (!companyTeamId) {
        statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
        return { response: formatApiResponse(statusMessage, null), statusMessage };
      }

      const userTeam = teams?.find((team) => team.id === companyTeamId);
      if (!userTeam) {
        loggerBack.warn(`User is not in team ${companyTeamId} associated with company ${targetId}`);
        statusMessage = STATUS_MESSAGE.FORBIDDEN;
        return { response: formatApiResponse(statusMessage, null), statusMessage };
      }

      const assertResult = convertTeamRoleCanDo({
        teamRole: userTeam.role as TeamRole,
        canDo: TeamPermissionAction.MODIFY_ACCOUNT_BOOK,
      });

      if (!assertResult.can) {
        loggerBack.warn(
          `User with role ${userTeam.role} doesn't have permission to modify company icon`
        );
        statusMessage = STATUS_MESSAGE.FORBIDDEN;
        return { response: formatApiResponse(statusMessage, null), statusMessage };
      }
    }
  }

  try {
    // Info: (20250522 - Shirley) 確保傳遞給 parseForm 的是有效的 FileFolder 類型
    const folder = type ? UPLOAD_TYPE_TO_FOLDER_MAP[type] || FileFolder.TMP : FileFolder.TMP;
    const parsedForm = await parseForm(req, folder);
    const { files, fields } = parsedForm;
    const { file } = files;
    const { isEncrypted, encryptedSymmetricKey, iv } = extractKeyAndIvFromFields(fields);

    if (!file) {
      statusMessage = STATUS_MESSAGE.UPLOAD_FILE_IS_EMPTY;
      loggerBack.info(`API POST File: No file uploaded`);
    } else {
      const returnFile = await handleFileUpload(
        type,
        file,
        targetId,
        isEncrypted,
        encryptedSymmetricKey,
        iv
      );

      if (returnFile) {
        statusMessage = STATUS_MESSAGE.CREATED;
        payload = returnFile;
        loggerBack.info(
          `File uploaded successfully: id=${returnFile.id}, type=${type || 'none'}, targetId=${targetId || 'none'}`
        );
      }
    }
  } catch (error) {
    const err = error as Error;
    loggerBack.error(`Error uploading file: ${err.message}`);
    statusMessage = err.message || STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR;
  }

  return { response: formatApiResponse(statusMessage, payload), statusMessage };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFileBeta | null>>
) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  let apiName: APIName = APIName.FILE_UPLOAD;
  const session = await getSession(req);

  try {
    switch (method) {
      case HttpMethod.POST:
        apiName = APIName.FILE_UPLOAD;
        ({
          response: { httpCode, result },
          statusMessage,
        } = await handlePostRequest(req));
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse(statusMessage, null));
        break;
    }
  } catch (error) {
    const err = error as Error;
    statusMessage = STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE] || err.message;
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }

  await logUserAction(session, apiName, req, statusMessage);
  res.status(httpCode).json(result);
}
