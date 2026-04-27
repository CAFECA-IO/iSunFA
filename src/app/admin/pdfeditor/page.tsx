"use client";

import { useState, useRef } from 'react';

import AdminPageHeader from '@/components/admin/common/admin_page_header';
import { FileText, Download, Edit3, Eye } from 'lucide-react';
import { MarkdownContent } from '@/components/common/markdown_content';
import { useTranslation } from '@/i18n/i18n_context';
import ConfirmModal from '@/components/common/confirm_modal';
import Image from 'next/image';


export default function AdminPdfEditorPage() {
  const { t } = useTranslation();
  const [markdownContext, setMarkdownContext] = useState<string>('# iSunFA Report\n\nEnter your markdown content here...');
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });

  const contentRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;

    setIsGenerating(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;

      const opt = {
        margin: 15,
        filename: `iSunFA_Document_${Date.now()}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // Info: (20260426 - Luphia) Globally proxy getComputedStyle during PDF generation to prevent html2canvas crashing on Tailwind v4's lab/oklch colors
      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = function (elt: Element, pseudoElt?: string | null) {
        const styles = originalGetComputedStyle.call(window, elt, pseudoElt);

        return new Proxy(styles, {
          get(target: CSSStyleDeclaration, prop: string | symbol) {
            const targetObj = target as unknown as Record<string | symbol, unknown>;
            if (typeof targetObj[prop] === 'function') {
              if (prop === 'getPropertyValue') {
                return function (property: string) {
                  const val = target.getPropertyValue(property);
                  if (typeof val === 'string' && (val.includes('lab') || val.includes('lch') || val.includes('color('))) {
                    if (property.toLowerCase().includes('shadow') || property.toLowerCase().includes('image')) return 'none';
                    return 'rgb(17, 24, 39)'; // Safe fallback
                  }
                  return val;
                };
              }
              return (targetObj[prop] as (...args: unknown[]) => unknown).bind(target);
            }

            const val = targetObj[prop];
            if (typeof val === 'string' && (val.includes('lab') || val.includes('lch') || val.includes('color('))) {
              if (String(prop).toLowerCase().includes('shadow') || String(prop).toLowerCase().includes('image')) return 'none';
              return 'rgb(17, 24, 39)'; // Safe fallback
            }

            return val;
          }
        });
      };

      try {
        await html2pdf().set(opt).from(contentRef.current).save();
      } finally {
        window.getComputedStyle = originalGetComputedStyle;
      }
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      setErrorModal({ isOpen: true, message: String(t('common.error.download_failed')) });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader
          icon={FileText}
          title={String(t('admin_mission_board.pdf_editor.title'))}
          subtitle={String(t('admin_mission_board.pdf_editor.subtitle'))}
        />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[800px]">
          {/* Info: (20260426 - Luphia) Editor Toolbar */}
          <div className="border-b border-gray-200 bg-gray-50 p-4 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('edit')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'edit'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <Edit3 className="w-4 h-4" />
                {String(t('admin_mission_board.pdf_editor.edit_markdown'))}
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'preview'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <Eye className="w-4 h-4" />
                {String(t('admin_mission_board.pdf_editor.preview_pdf'))}
              </button>
            </div>

            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating || !markdownContext.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-orange-600 text-white hover:bg-orange-500 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isGenerating ? String(t('admin_mission_board.pdf_editor.generating')) : String(t('admin_mission_board.pdf_editor.download_pdf'))}
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Info: (20260426 - Luphia) Editor Pane */}
            <div className={`flex-1 flex flex-col border-r border-gray-200 ${viewMode === 'preview' ? 'hidden md:flex' : 'flex'}`}>
              <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                {String(t('admin_mission_board.pdf_editor.markdown_input'))}
              </div>
              <textarea
                aria-label="Markdown Input"
                value={markdownContext}
                onChange={(e) => setMarkdownContext(e.target.value)}
                className="flex-1 p-6 resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500 font-mono text-sm text-gray-800"
                placeholder={String(t('admin_mission_board.pdf_editor.type_here'))}
              />
            </div>

            {/* Info: (20260426 - Luphia) Preview Pane */}
            <div className={`flex-1 flex flex-col bg-gray-100 overflow-y-auto ${viewMode === 'edit' ? 'hidden md:flex' : 'flex'}`}>
              <div className="sticky top-0 bg-gray-200 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider z-10">
                {String(t('admin_mission_board.pdf_editor.pdf_preview'))}
              </div>
              <div className="p-8 flex justify-center min-h-full">
                {/* Info: (20260426 - Luphia) A4 Document Container */}
                <div
                  className="bg-white shadow-md border border-gray-300 w-full max-w-[210mm] min-h-[297mm] mx-auto text-black"
                >
                  <div id="pdf-content" ref={contentRef} className="flex flex-col min-h-full bg-[#ffffff] font-sans">
                    {/* Info: (20260426 - Luphia) iSunFA Header */}
                    <div className="bg-[#111827] px-6 py-4 flex justify-between items-center rounded-t-xl">
                      <div className="text-[#ffffff] font-bold text-lg flex items-center gap-3">
                        <Image src="/isunfa_logo.svg" alt="iSunFA Logo" width={112} height={32} unoptimized className="h-7 w-auto" />
                        <span className="inline-block border-l border-[#4b5563] pl-3">{String(t('admin_mission_board.pdf_editor.brand'))}</span>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-[#3b82f6]/10 px-3 py-1 text-xs font-medium text-[#60a5fa] ring-1 ring-inset ring-[#60a5fa]/30">
                        {String(t('admin_mission_board.pdf_editor.internal_document'))}
                      </span>
                    </div>

                    <div className="p-6 sm:p-10 flex-1">
                      <div className="border-b border-[#f3f4f6] pb-6 mb-6">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-[#ffedd5] text-[#c2410c] px-2 py-0.5 rounded text-xs font-bold">
                            {String(t('admin_mission_board.pdf_editor.system_report'))}
                          </span>
                        </div>
                        <p className="text-sm text-[#6b7280] flex items-center gap-2">
                          iSunFA Enterprise Solutions
                          <span className="text-[#d1d5db]">•</span>
                          <span>
                            {new Date().toLocaleDateString().replace(/-/g, '/')}
                          </span>
                        </p>
                      </div>

                      {/* Info: (20260426 - Luphia) Markdown Content */}
                      <div className="max-w-none text-[#374151]">
                        <MarkdownContent content={markdownContext} theme="light" />
                      </div>
                    </div>

                    {/* Info: (20260426 - Luphia) iSunFA Footer */}
                    <div className="bg-[#fff7ed] px-6 py-8 border-t border-[#ffedd5] text-center rounded-b-xl">
                      <h3 className="text-lg font-bold text-[#111827] mb-2">{String(t('admin_mission_board.pdf_editor.footer_title'))}</h3>
                      <p className="text-sm text-[#4b5563] max-w-lg mx-auto">{String(t('admin_mission_board.pdf_editor.footer_text', { year: new Date().getFullYear() }))}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        title={String(t('common.notification'))}
        message={errorModal.message}
        confirmText={String(t('common.ok'))}
      />
    </div>
  );
}
