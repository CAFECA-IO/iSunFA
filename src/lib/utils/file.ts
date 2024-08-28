import { LOG_FOLDER, UPLOAD_IMAGE_FOLDERS_TO_CREATE_WHEN_START_SERVER } from '@/constants/file';
import { CRYPTO_FOLDER_PATH } from '@/constants/crypto';
import { promises as fs } from 'fs';

export async function createFileFoldersIfNotExists(): Promise<void> {
  UPLOAD_IMAGE_FOLDERS_TO_CREATE_WHEN_START_SERVER.map(async (folder) => {
    try {
      await fs.mkdir(folder, { recursive: true });
      // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
    } catch (error) {
      // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
    }
  });
  CRYPTO_FOLDER_PATH.map(async (folder) => {
    await fs.mkdir(folder, { recursive: true });
  });
  await fs.mkdir(LOG_FOLDER, { recursive: true });
}
