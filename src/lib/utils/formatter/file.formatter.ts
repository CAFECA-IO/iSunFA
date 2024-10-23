import { File as PrismaFile } from '@prisma/client';
import { z } from 'zod';
import { IFileEntity } from '@/interfaces/file';
import { FileFolder } from '@/constants/file';
import { FormatterError } from '@/lib/utils/error/formatter_error';

/**
 * Info: (20241023 - Murky)
 * @description convert Prisma.File to IFileEntity
 * @note buffer is not parsed and will be undefined
 */
export function parsePrismaFileToFileEntity(dto: PrismaFile): IFileEntity {
  // ToDo: (20241023 - Murky) Need to move to other place
  const fileEntitySchema = z.object({
    id: z.number(),
    name: z.string(),
    size: z.number(),
    mimeType: z.string(),
    type: z.nativeEnum(FileFolder),
    url: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().nullable(),
  });

  const { data, success, error } = fileEntitySchema.safeParse(dto);

  if (!success) {
    throw new FormatterError('FileEntity format prisma data error', {
      dto,
      zodErrorMessage: error.message,
      issues: error.errors,
    });
  }

  return data;
}
