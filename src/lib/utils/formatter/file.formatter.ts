import { File as PrismaFile } from '@prisma/client';
import { IFileEntity } from '@/interfaces/file';
import { FormatterError } from '@/lib/utils/error/formatter_error';
import { fileEntityValidator } from '@/lib/utils/zod_schema/file';
import { getImageUrlFromFileIdV1 } from '@/lib/utils/file';

/**
 * Info: (20241023 - Murky)
 * @description convert Prisma.File to IFileEntity
 * @note buffer is not parsed and will be undefined
 * @note please check fileEntityValidator for how to parse the data
 */
export function parsePrismaFileToFileEntity(
  dto: PrismaFile & { thumbnail?: PrismaFile | null },
  transformUrlToActualLink = false
): IFileEntity {
  const { data, success, error } = fileEntityValidator.safeParse(dto);

  if (!success) {
    throw new FormatterError('FileEntity format prisma data error', {
      dto,
      zodErrorMessage: error.message,
      issues: error.issues,
    });
  }

  const fileEntity: IFileEntity = {
    ...data,
    thumbnailId: dto.thumbnailId || null,
  };

  if (transformUrlToActualLink) {
    fileEntity.url = getImageUrlFromFileIdV1(fileEntity.id);
  }

  // Info: (20250513 - Shirley) 處理縮圖與檔案關聯
  if (dto.thumbnail) {
    fileEntity.thumbnail = parsePrismaFileToFileEntity(dto.thumbnail, transformUrlToActualLink);
  }

  return fileEntity;
}
