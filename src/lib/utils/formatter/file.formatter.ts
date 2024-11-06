import { File as PrismaFile } from '@prisma/client';
import { IFileEntity } from '@/interfaces/file';
import { FormatterError } from '@/lib/utils/error/formatter_error';
import { fileEntityValidator } from '@/lib/utils/zod_schema/file';

/**
 * Info: (20241023 - Murky)
 * @description convert Prisma.File to IFileEntity
 * @note buffer is not parsed and will be undefined
 * @note please check fileEntityValidator for how to parse the data
 */
export function parsePrismaFileToFileEntity(dto: PrismaFile): IFileEntity {
  const { data, success, error } = fileEntityValidator.safeParse(dto);

  if (!success) {
    throw new FormatterError('FileEntity format prisma data error', {
      dto,
      zodErrorMessage: error.message,
      issues: error.errors,
    });
  }

  return data;
}
