import { promises as fs } from 'fs';
import path from 'path';
import { MarkdownContent } from '@/components/common/markdown_content';
import Header from '@/components/landing_page/header';
import Footer from '@/components/landing_page/footer';

export default async function TermsOfService() {
  const filePath = path.join(process.cwd(), 'documents/terms_of_service.md');
  const content = await fs.readFile(filePath, 'utf8');

  return (
    <div className="flex min-h-screen flex-col bg-slate-800">
      <Header />
      <main className="flex-grow">
        <div className="mx-auto max-w-3xl px-6 py-24 sm:py-32 lg:px-8">
          <MarkdownContent content={content} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
