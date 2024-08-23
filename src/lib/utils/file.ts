import { LOG_FOLDER, UPLOAD_IMAGE_FOLDERS_TO_CREATE_WHEN_START_SERVER } from '@/constants/file';
import { promises as fs } from 'fs';

export async function createFileFoldersIfNotExists(): Promise<void> {
  UPLOAD_IMAGE_FOLDERS_TO_CREATE_WHEN_START_SERVER.map(async (folder) => {
    try {
      await fs.mkdir(folder, { recursive: true });
      // Deprecate: (20240812 - Murky): Debugging purpose
      // eslint-disable-next-line no-console
      console.log(`Folder ${folder} created.`);
    } catch (error) {
      // Deprecate: (20240812 - Murky): Debugging purpose
      // eslint-disable-next-line no-console
      console.error(`Error while creating folder: ${error}`);
    }
  });
  await fs.mkdir(LOG_FOLDER, { recursive: true });
}
