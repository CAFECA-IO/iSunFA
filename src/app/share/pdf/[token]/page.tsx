import { pdfEditorDocumentRepo } from "@/repositories/pdf_editor_document.repo";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import PublicPdfClientView from "@/app/share/pdf/[token]/public_pdf_client_view";

/**
 * Info: (20260604 - Julian) 設定 PDF 分享頁的 SEO
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Document | iSunFA",
    openGraph: {
      title: "Document | iSunFA",
      type: "website",
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function PublicPdfPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const doc = await pdfEditorDocumentRepo.findDocumentUnique({
    where: { token, isActive: true },
    include: {
      createdBy: {
        select: { name: true },
      },
    },
  });

  if (!doc) return notFound();

  return <PublicPdfClientView content={doc.content} />;
}
