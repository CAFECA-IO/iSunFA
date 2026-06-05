import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated";

export const pdfEditorDocumentRepo = {
  findDocumentUnique<T extends Prisma.PdfEditorDocumentFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.PdfEditorDocumentFindUniqueArgs>,
  ) {
    return prisma.pdfEditorDocument.findUnique(args);
  },
  findDocumentFirst<T extends Prisma.PdfEditorDocumentFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.PdfEditorDocumentFindFirstArgs>,
  ) {
    return prisma.pdfEditorDocument.findFirst(args);
  },
  createDocument<T extends Prisma.PdfEditorDocumentCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.PdfEditorDocumentCreateArgs>,
  ) {
    return prisma.pdfEditorDocument.create(args);
  },
  updateDocument<T extends Prisma.PdfEditorDocumentUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.PdfEditorDocumentUpdateArgs>,
  ) {
    return prisma.pdfEditorDocument.update(args);
  },
};
