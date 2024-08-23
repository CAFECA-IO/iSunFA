<<<<<<< HEAD
import { LOG_FOLDER, UPLOAD_IMAGE_FOLDERS_TO_CREATE_WHEN_START_SERVER } from '@/constants/file';
=======
import { UPLOAD_IMAGE_FOLDERS_TO_CREATE_WHEN_START_SERVER } from '@/constants/file';
>>>>>>> develop
import { promises as fs } from 'fs';

export async function createFileFoldersIfNotExists(): Promise<void> {
  UPLOAD_IMAGE_FOLDERS_TO_CREATE_WHEN_START_SERVER.map(async (folder) => {
    try {
      await fs.mkdir(folder, { recursive: true });
<<<<<<< HEAD
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
=======
      // Todo: (20240822 - Anna) feat. Murky - 使用 logger
    } catch (error) {
      // Todo: (20240822 - Anna) feat. Murky - 使用 logger
    }
  });
>>>>>>> develop
}
