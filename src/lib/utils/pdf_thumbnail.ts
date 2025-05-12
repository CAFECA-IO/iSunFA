/* eslint-disable */
import * as fs from 'fs/promises';
import loggerBack from '@/lib/utils/logger_back';
import { pdf } from 'pdf-to-img';

/**
 * Test function to generate a thumbnail from the first page of a PDF
 *
 * Info: (20250507 - Shirley) Updated to use pdf-to-img library with detailed logging
 * of all steps in the process. This function maintains the same signature as the
 * previous implementation for backward compatibility.
 *
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
    // Log the start of the process
    loggerBack.info(`Starting PDF thumbnail generation test for: ${pdfPath}`);

    // Check if file exists
    await fs.access(pdfPath);
    loggerBack.info(`PDF file exists at: ${pdfPath}`);

    // Log file information
    const fileStats = await fs.stat(pdfPath);
    loggerBack.info(`PDF file size: ${fileStats.size} bytes`);

    // Load the PDF document with higher scale for better quality
    loggerBack.info(`Loading PDF document...`);
    const document = await pdf(pdfPath, { scale: 3 });
    loggerBack.info(`PDF document loaded successfully`);

    // Get the first page and generate image
    loggerBack.info(`Extracting first page of PDF...`);
    const firstPageImage = await document.getPage(1);

    if (!firstPageImage) {
      throw new Error('Failed to extract first page from PDF');
    }
    loggerBack.info(`First page extracted, image size: ${firstPageImage.length} bytes`);

    // Create the thumbnail path with customization if provided
    let baseFilename = pdfPath.replace('.pdf', '');

    // Apply string removal if specified
    if (thumbnailNameOptions?.removeString) {
      baseFilename = baseFilename.replace(thumbnailNameOptions.removeString, '');
      loggerBack.info(`Removed string "${thumbnailNameOptions.removeString}" from filename`);
    }

    // Apply custom suffix or default to _thumbnail
    const suffix = thumbnailNameOptions?.suffix || '_thumbnail';
    const thumbnailPath = `${baseFilename}${suffix}.png`;

    loggerBack.info(`Writing thumbnail to: ${thumbnailPath}`);

    // Write the image buffer to the thumbnail file
    await fs.writeFile(thumbnailPath, firstPageImage);

    // Get the size of the generated thumbnail
    const stats = await fs.stat(thumbnailPath);
    const size = stats.size;

    loggerBack.info(`Thumbnail saved successfully at: ${thumbnailPath}, size: ${size} bytes`);

    return {
      filepath: thumbnailPath,
      size: size,
      success: true,
    };
  } catch (error) {
    loggerBack.error(error, 'Error in generatePDFThumbnail');
    return {
      filepath: '',
      size: 0,
      success: false,
    };
  }
}
