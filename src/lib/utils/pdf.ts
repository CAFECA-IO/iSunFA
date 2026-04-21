import { toPng } from "html-to-image";
import { PDFDocument, rgb } from "pdf-lib";

export interface IDownloadPdfOptions {
  backgroundColor?: string;
  marginColor?: [number, number, number]; // Info:(20260331 - Julian) RGB 值（介於 0.0 ~ 1.0）
  filter?: (node: HTMLElement) => boolean;
}

export const downloadHtmlAsPdf = async (
  elementId: string,
  filename: string,
  options?: IDownloadPdfOptions,
) => {
  try {
    const element = document.getElementById(elementId);

    if (!element) {
      console.error("Element not found for PDF generation");
      return;
    }

    // Info:(20260418 - Tzuhan) Intelligently inject layout margin spacers to prevent PDF chunk slicing!
    const a4Width = 595.28;
    const a4Height = 841.89;
    const margin = 42.52;

    const maxPdfHeight = a4Height - margin * 2;
    const maxPdfWidth = a4Width - margin * 2;
    const scaleFactor = 2; // Info: (20260418 - Tzuhan) pixelRatio

    // Info: (20260418 - Tzuhan) Original bounding rect of container
    const containerRect = element.getBoundingClientRect();
    const pixelToPtRatio = maxPdfWidth / containerRect.width;

    // Info: (20260418 - Tzuhan) The height of 1 PDF page translated into DOM browser pixels
    const maxDomHeightPerPage = maxPdfHeight / pixelToPtRatio;

    // Info: (20260418 - Tzuhan) We will find all elements marked 'break-inside-avoid' and push them down if they cross a boundary
    const avoidElements = element.querySelectorAll('.break-inside-avoid');

    // Info: (20260420 - Tzuhan) Keep track of inserted spacers
    const insertedSpacers: HTMLDivElement[] = [];

    // Info: (20260418 - Tzuhan) Make sure we scan elements in DOM order
    const elementsArray = Array.from(avoidElements);

    for (let i = 0; i < elementsArray.length; i++) {
      const el = elementsArray[i] as HTMLElement;
      const rect = el.getBoundingClientRect();

      // Info: (20260418 - Tzuhan) Element's top relative to container
      const currentRelativeTop = (el.getBoundingClientRect().top - element.getBoundingClientRect().top);
      const relativeBottom = currentRelativeTop + rect.height;

      const startPage = Math.floor(currentRelativeTop / maxDomHeightPerPage);
      const endPage = Math.floor(relativeBottom / maxDomHeightPerPage);

      // Info: (20260418 - Tzuhan) If element crosses a page boundary AND it's smaller than a full page
      if (startPage !== endPage && rect.height < maxDomHeightPerPage) {
        // Info: (20260418 - Tzuhan) We need to push this element down so it starts exactly on the next page
        // Info: (20260418 - Tzuhan) We add a 2px buffer to ensure we completely clear the mathematical cut line
        const nextPageStartTop = (startPage + 1) * maxDomHeightPerPage;
        const pushDownAmount = Math.ceil(nextPageStartTop - currentRelativeTop) + 2;

        // Info: (20260420 - Tzuhan) Insert a physical spacer div to push element without margin collapsing issues
        const spacer = document.createElement('div');
        spacer.style.height = `${pushDownAmount}px`;
        spacer.style.width = '100%';
        spacer.style.backgroundColor = 'transparent';
        spacer.classList.add('pdf-avoid-spacer');
        el.parentNode?.insertBefore(spacer, el);
        insertedSpacers.push(spacer);
      }
    }

    // Info: (20260418 - Tzuhan) Wait for DOM to re-layout with new margins
    await new Promise(r => setTimeout(r, 100));

    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: scaleFactor,
      cacheBust: true,
      backgroundColor: options?.backgroundColor || "#ffffff",
      filter: options?.filter,
    });

    // Info: (20260420 - Tzuhan) Revert inserted spacers
    insertedSpacers.forEach(spacer => spacer.remove());

    const pdfDoc = await PDFDocument.create();

    const pngImage = await pdfDoc.embedPng(dataUrl);
    const { width: imgWidth, height: imgHeight } = pngImage.scale(1);

    const ratio = maxPdfWidth / imgWidth;
    const scaledHeight = imgHeight * ratio;

    let heightLeft = scaledHeight;
    let position = 0;

    const pageColor = options?.marginColor
      ? rgb(...options.marginColor)
      : rgb(1, 1, 1);

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

    const blob = new Blob([pdfBytes as unknown as BlobPart], {
      type: "application/pdf",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (err) {
    console.error("Error generating PDF:", err);
  }
};
