import fs from 'fs/promises';
import { NextApiRequest, NextApiResponse } from 'next';
import { UPLOAD_TYPE_TO_FOLDER_MAP, UploadType } from '@/constants/file';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IFileBeta } from '@/interfaces/file';
import { parseForm } from '@/lib/utils/parse_image_form';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { uploadFile } from '@/lib/utils/google_image_upload';
import { getCompanyById, updateCompanyById } from '@/lib/utils/repo/company.repo';
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
  type: UploadType,
  file: formidable.File[],
  targetId: string,
  isEncrypted: boolean,
  encryptedSymmetricKey: string,
  iv: Uint8Array
) {
  const fileForSave = file[0];
  const fileName = fileForSave.newFilename;
  const fileMimeType = fileForSave.mimetype || 'image/jpeg';
  const fileSize = fileForSave.size;
  const targetIdNum = type !== UploadType.ROOM ? convertStringToNumber(targetId) : -1;
  let fileUrl = '';

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
  const ivBuffer = uint8ArrayToBuffer(iv);

  const fileInDB = await createFile({
    name: fileName,
    size: fileSize,
    mimeType: fileMimeType,
    type: UPLOAD_TYPE_TO_FOLDER_MAP[type] || 'team',
    url: fileUrl,
    isEncrypted,
    encryptedSymmetricKey,
    iv: ivBuffer,
  });

  if (!fileInDB) {
    throw new Error(STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR);
  }

  let thumbnailInfo = null;
  let pdfPath = fileForSave.filepath;
  if (type === UploadType.INVOICE && fileMimeType === 'application/pdf') {
    // Decrypt PDF file if it's encrypted
    if (isEncrypted) {
      // 獲取公司ID和私鑰
      const companyId = convertStringToNumber(targetId);
      const encryptedFileBuffer = await fs.readFile(fileForSave.filepath);
      const arrayBuffer = new Uint8Array(encryptedFileBuffer).buffer;

      // 獲取私鑰
      const privateKey = await getPrivateKeyByCompany(companyId);
      if (!privateKey) {
        throw new Error('Private key not found for decryption');
      }

      // 解密檔案
      const ivUint8Array = new Uint8Array(ivBuffer);
      const decryptedBuffer = await decryptFile(
        arrayBuffer,
        encryptedSymmetricKey,
        privateKey,
        ivUint8Array
      );

      // 寫入臨時解密檔案
      const tempDecryptedPath = `${fileForSave.filepath.replace(/\.[^/.]+$/, '')}_decrypted.pdf`;
      await fs.writeFile(tempDecryptedPath, Buffer.from(decryptedBuffer));
      pdfPath = tempDecryptedPath;
    }

    // Notes: generate PDF thumbnail
    try {
      loggerBack.info(`Generating PDF thumbnail for file: ${fileForSave.filepath}`);
      // thumbnailInfo = await generatePDFThumbnail(fileForSave.filepath);
      thumbnailInfo = await generatePDFThumbnail(pdfPath);

      if (!thumbnailInfo.success) {
        loggerBack.error('Failed to generate PDF thumbnail');
      }
    } catch (error) {
      loggerBack.error(error, 'Error generating PDF thumbnail');
    }
  }

  // If we have a thumbnail, process it with the same encryption parameters
  if (thumbnailInfo && thumbnailInfo.success) {
    const thumbnailFileName = path.basename(thumbnailInfo.filepath);
    const thumbnailUrl = generateFilePathWithBaseUrlPlaceholder(
      thumbnailFileName,
      UPLOAD_TYPE_TO_FOLDER_MAP[type]
    );

    if (isEncrypted) {
      // 加密 thumbnail 之後存到 DB
      const companyId = convertStringToNumber(targetId);
      const thumbnailBuffer = await fs.readFile(thumbnailInfo.filepath);
      const publicKey = await getPublicKeyByCompany(companyId);

      if (!publicKey) {
        throw new Error('Public key not found for encryption');
      }

      const ivUint8Array = new Uint8Array(ivBuffer);
      const { encryptedContent } = await encryptFile(
        new Uint8Array(thumbnailBuffer).buffer as ArrayBuffer,
        publicKey,
        ivUint8Array
      );

      // 寫入加密縮略圖
      const encryptedThumbnailPath = `${thumbnailInfo.filepath}`;
      await fs.writeFile(encryptedThumbnailPath, Buffer.from(encryptedContent));
    }
    // Create thumbnail record with the same encryption parameters
    const thumbnailInDB = await createFile({
      name: thumbnailFileName,
      size: thumbnailInfo.size,
      mimeType: 'image/png',
      type: UPLOAD_TYPE_TO_FOLDER_MAP[type],
      url: thumbnailUrl,
      isEncrypted,
      encryptedSymmetricKey,
      iv: ivBuffer,
    });

    if (thumbnailInDB && fileInDB) {
      // Update original file record with thumbnail ID
      await putFileById(fileInDB.id, {
        thumbnailId: thumbnailInDB.id,
      });
    }
  }

  const fileId = fileInDB.id;
  const returnFile: IFileBeta = {
    id: fileId,
    name: fileName,
    size: fileSize,
    url: `/image/${fileId}`,
    existed: true,
    // thumbnailId: thumbnailInDB?.id,
  };

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

  loggerBack.info(`fileForSave: ${fileForSave}`);

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
  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }
  const { type, targetId } = query;

  // Info: (20250410 - Shirley) 檢查用戶是否有權限上傳圖片(Team, Company)
  if (type === UploadType.TEAM) {
    // Info: (20250410 - Shirley) 直接比對 session 中的 teams 是否包含 targetId，再檢查 role 是否可以上傳圖片
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
    // Info: (20250410 - Shirley) 要找到 company 對應的 team，然後跟 session 中的 teams 比對，再用 session 的 role 來檢查權限
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

  try {
    const parsedForm = await parseForm(req, UPLOAD_TYPE_TO_FOLDER_MAP[type]);
    const { files, fields } = parsedForm;
    const { file } = files;
    const { isEncrypted, encryptedSymmetricKey, iv } = extractKeyAndIvFromFields(fields);

    if (!file) {
      statusMessage = STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR;
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
          `File uploaded successfully: id=${returnFile.id}, type=${type}, targetId=${targetId}`
        );
      }
    }
  } catch (error) {
    const err = error as Error;
    loggerBack.error(`Error uploading file: ${err.message}`);
    statusMessage =
      STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE] ||
      STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
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
