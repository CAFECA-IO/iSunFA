import { toPng } from 'html-to-image';
import { PDFDocument, rgb } from 'pdf-lib';

export interface IDownloadPdfOptions {
  backgroundColor?: string;
  marginColor?: [number, number, number]; // Info:(20260331 - Julian) RGB 值（介於 0.0 ~ 1.0）
  filter?: (node: HTMLElement) => boolean;
}

export const downloadHtmlAsPdf = async (
  elementId: string,
  filename: string,
  options?: IDownloadPdfOptions
) => {
  try {
    const element = document.getElementById(elementId);

    if (!element) {
      console.error('Element not found for PDF generation');
      return;
    }

    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: options?.backgroundColor || '#ffffff',
      filter: options?.filter,
    });

    const pdfDoc = await PDFDocument.create();

    const pngImage = await pdfDoc.embedPng(dataUrl);
    const { width: imgWidth, height: imgHeight } = pngImage.scale(1);

    const a4Width = 595.28;
    const a4Height = 841.89;
    const margin = 42.52;

    const maxPdfHeight = a4Height - (margin * 2);
    const maxPdfWidth = a4Width - (margin * 2);

    const ratio = maxPdfWidth / imgWidth;
    const scaledHeight = imgHeight * ratio;

    let heightLeft = scaledHeight;
    let position = 0;

    const pageColor = options?.marginColor ? rgb(...options.marginColor) : rgb(1, 1, 1);

    let page = pdfDoc.addPage([a4Width, a4Height]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: a4Width,
      height: a4Height,
      color: pageColor,
    });
    
    page.drawImage(pngImage, {
      x: margin,
      y: a4Height - margin - scaledHeight,
      width: maxPdfWidth,
      height: scaledHeight,
    });
    heightLeft -= maxPdfHeight;

    while (heightLeft > 0) {
      position -= maxPdfHeight;
      page = pdfDoc.addPage([a4Width, a4Height]);
      
      page.drawRectangle({
        x: 0,
        y: 0,
        width: a4Width,
        height: a4Height,
        color: pageColor,
      });

      page.drawImage(pngImage, {
        x: margin,
        y: a4Height - margin - scaledHeight + Math.abs(position),
        width: maxPdfWidth,
        height: scaledHeight,
      });

      heightLeft -= maxPdfHeight;
    }

    const pages = pdfDoc.getPages();
    pages.forEach((p) => {
      p.drawRectangle({
        x: 0,
        y: 0,
        width: a4Width,
        height: margin,
        color: pageColor,
      });

      p.drawRectangle({
        x: 0,
        y: a4Height - margin,
        width: a4Width,
        height: margin,
        color: pageColor,
      });
    });

    const pdfBytes = await pdfDoc.save();

    const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

  } catch (err) {
    console.error('Error generating PDF:', err);
  }
};
