import { UPLOAD_IMAGE_FOLDERS_TO_CREATE_WHEN_START_SERVER } from '@/constants/file';
import { promises as fs } from 'fs';

export async function createFileFoldersIfNotExists(): Promise<void> {
  UPLOAD_IMAGE_FOLDERS_TO_CREATE_WHEN_START_SERVER.map(async (folder) => {
    try {
      await fs.mkdir(folder, { recursive: true });
      // Todo: (20240822 - Murky Anna) 使用 logger
    } catch (error) {
      // Todo: (20240822 - Murky Anna) 使用 logger
    }
  });
}
