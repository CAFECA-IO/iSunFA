/* eslint-disable */
import * as fs from 'fs/promises';
import * as path from 'path';
import loggerBack from '@/lib/utils/logger_back';
import { STATUS_MESSAGE } from '@/constants/status_code';

/**
 * Generate a thumbnail from the first page of a PDF file using pdf-to-img library
 *
 * Info: (20250507 - Shirley) Replaced previous implementation that used pdfjs-dist
 * with pdf-to-img package for better compatibility and performance.
 *
 * @param pdfPath Path to the PDF file
 * @returns Path to the generated thumbnail and its size
 */
export async function generatePDFThumbnail(pdfPath: string): Promise<{
  filepath: string;
  size: number;
}> {
  try {
    loggerBack.info(`Starting PDF thumbnail generation for: ${pdfPath}`);

    // Dynamically import pdf-to-img to avoid ESM/CJS compatibility issues
    const { pdf } = await import('pdf-to-img');

    // Get the first page of the PDF document with increased scale for better quality
    const document = await pdf(pdfPath, { scale: 2 });
    const firstPageImage = await document.getPage(1);

    if (!firstPageImage) {
      throw new Error('Failed to extract first page from PDF');
    }

    // Create the thumbnail path with the same name but _thumbnail.png extension
    const thumbnailPath = pdfPath.replace('.pdf', '_thumbnail.png');

    // Write the image buffer to the thumbnail file
    await fs.writeFile(thumbnailPath, firstPageImage);

    // Get the size of the generated thumbnail
    const stats = await fs.stat(thumbnailPath);
    const size = stats.size;

    loggerBack.info(
      `PDF thumbnail generated successfully at: ${thumbnailPath}, size: ${size} bytes`
    );

    return {
      filepath: thumbnailPath,
      size: size,
    };
  } catch (error) {
    loggerBack.error(error, 'Error in generatePDFThumbnail');
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
  }
}

/**
 * Test function to generate a thumbnail from the first page of a PDF
 *
 * Info: (20250507 - Shirley) Updated to use pdf-to-img library with detailed logging
 * of all steps in the process. This function maintains the same signature as the
 * previous implementation for backward compatibility.
 *
 * @param pdfPath Path to the PDF file
 * @returns Object containing path to the generated thumbnail, its size, and success status
 */
export async function testGeneratePDFThumbnail(pdfPath: string): Promise<{
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

    // Dynamically import pdf-to-img to avoid ESM/CJS compatibility issues
    loggerBack.info(`Importing pdf-to-img library...`);
    const { pdf } = await import('pdf-to-img');

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

    // Create the thumbnail path with test suffix
    const thumbnailPath = pdfPath.replace('.pdf', '_thumbnail_test.png');
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
    loggerBack.error(error, 'Error in testGeneratePDFThumbnail');
    return {
      filepath: '',
      size: 0,
      success: false,
    };
  }
}
