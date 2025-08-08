import * as fs from 'fs/promises';
import { pdf } from 'pdf-to-img';
import loggerBack from '@/lib/utils/logger_back';

/**
 * Info: (20250507 - Shirley) PDF thumbnail generator
 * @param pdfPath Path to the PDF file
 * @param thumbnailNameOptions Optional parameters for customizing the thumbnail filename
 * @returns Object containing path to the generated thumbnail, its size, and success status
 */
export async function generatePDFThumbnail(
  pdfPath: string,
  thumbnailNameOptions?: {
    removeString?: string;
    suffix?: string;
  }
): Promise<{
  filepath: string;
  size: number;
  success: boolean;
}> {
  try {
    // Info: (20250507 - Shirley) Check if file exists
    // ToDo: (20250710 - Luphia) Use IPFS to store files (S1: 檢查檔案存在/狀態)
    await fs.access(pdfPath);

    const document = await pdf(pdfPath, { scale: 3 });

    const firstPageImage = await document.getPage(1);

    if (!firstPageImage) {
      throw new Error('Failed to extract first page from PDF');
    }

    // Info: (20250507 - Shirley) Create the thumbnail path with customization if provided
    let baseFilename = pdfPath.replace('.pdf', '');

    // Info: (20250507 - Shirley) Apply string removal if specified
    if (thumbnailNameOptions?.removeString) {
      baseFilename = baseFilename.replace(thumbnailNameOptions.removeString, '');
    }

    // Info: (20250507 - Shirley) Apply custom suffix or default to _thumbnail
    const suffix = thumbnailNameOptions?.suffix || '_thumbnail';
    const thumbnailPath = `${baseFilename}${suffix}.png`;

    // Info: (20250507 - Shirley) Write the image buffer to the thumbnail file
    // ToDo: (20250710 - Luphia) Use IPFS to store files (S1: 寫入縮圖/檔案)
    await fs.writeFile(thumbnailPath, firstPageImage);

    // Info: (20250507 - Shirley) Get the size of the generated thumbnail
    // ToDo: (20250710 - Luphia) Use IPFS to store files (S1: 檢查檔案存在/狀態)
    const stats = await fs.stat(thumbnailPath);
    const { size } = stats;

    return {
      filepath: thumbnailPath,
      size,
      success: true,
    };
  } catch (error) {
    loggerBack.error(`Error in generatePDFThumbnail`);
    loggerBack.error(error);
    return {
      filepath: '',
      size: 0,
      success: false,
    };
  }
}
