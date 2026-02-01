
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function mergeSlidesToPdf() {
  const slidesDir = path.join(process.cwd(), 'public/deep_review');
  const outputPdfPath = path.join(slidesDir, 'output.pdf');

  // Info: (20260201 - Luphia) Read all files in the directory
  const files = fs.readdirSync(slidesDir);

  // Info: (20260201 - Luphia) Filter for PNG files and sort them naturally
  const pngFiles = files
    .filter(file => file.toLowerCase().endsWith('.png') && file.startsWith('DeepReview_Slide_'))
    .sort((a, b) => {
      // Info: (20260201 - Luphia) Extract number from filename for correct sorting
      const numA = parseInt(a.match(/(\d+)/)?.[0] || '0', 10);
      const numB = parseInt(b.match(/(\d+)/)?.[0] || '0', 10);
      return numA - numB;
    });

  if (pngFiles.length === 0) {
    console.error('No PNG slide files found in public/deep_review');
    return;
  }

  console.log(`Found ${pngFiles.length} slides to merge.`);

  // Info: (20260201 - Luphia) Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  for (const file of pngFiles) {
    const filePath = path.join(slidesDir, file);
    const imageBytes = fs.readFileSync(filePath);

    // Info: (20260201 - Luphia) Embed the PNG image
    const image = await pdfDoc.embedPng(imageBytes);

    // Info: (20260201 - Luphia) Get image dimensions
    const { width, height } = image.scale(1);

    // Info: (20260201 - Luphia) Add a page with the same dimensions as the image
    const page = pdfDoc.addPage([width, height]);

    // Info: (20260201 - Luphia) Draw the image onto the page
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: width,
      height: height,
    });

    console.log(`Added ${file} to PDF`);
  }

  // Info: (20260201 - Luphia) Save the PDF
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPdfPath, pdfBytes);

  console.log(`Successfully created PDF at: ${outputPdfPath}`);
}

mergeSlidesToPdf().catch(err => {
  console.error('Error merging slides to PDF:', err);
});
