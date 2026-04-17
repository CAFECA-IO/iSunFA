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

    // Info: (20260418 - System) Upgraded to html2pdf.js to natively support CSS page-break-inside layout
    const html2pdf = (await import('html2pdf.js')).default;

    const originalBg = element.style.backgroundColor;
    if (options?.backgroundColor) {
      element.style.backgroundColor = options.backgroundColor;
    }


    const opt = {
      margin: 12,
      filename: filename,
      image: { type: 'jpeg' as const, quality: 1.0 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,

        ignoreElements: (node: HTMLElement) => {
          if (options?.filter && !options.filter(node)) return true;
          return false;
        }
      },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      pagebreak: {
        mode: ['css', 'legacy'] as const,
        avoid: ['.break-inside-avoid', 'tr', 'thead', 'tbody']
      }
    };

    await html2pdf().set(opt).from(element).save();

    if (options?.backgroundColor) {
      element.style.backgroundColor = originalBg;
    }
  } catch (err) {
    console.error("Error generating PDF:", err);
  }
};
