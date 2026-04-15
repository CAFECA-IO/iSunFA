import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MermaidChart } from '@/components/common/mermaid_chart';

interface IMarkdownContentProps {
  content: string;
  theme?: 'dark' | 'light';
}

const MarkdownContent: React.FC<IMarkdownContentProps> = ({ content, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const secondaryTextColor = isDark ? 'text-[#E0E0E0]' : 'text-gray-700';
  const linkColor = isDark ? 'text-[#64B5F6]' : 'text-blue-600';
  const borderColor = isDark ? 'border-[#444]' : 'border-gray-200';
  const blockquoteBg = isDark ? 'bg-[#FF9800]/10' : 'bg-orange-50';
  const blockquoteText = isDark ? 'text-[#FFE0B2]' : 'text-orange-800';
  const tableBorder = isDark ? 'border-[#444]' : 'border-gray-300';
  const theadBg = isDark ? 'bg-white/5' : 'bg-gray-50';
  const thText = isDark ? 'text-[#FFB74D]' : 'text-orange-700';

  const result = (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children, ...props }: React.ComponentPropsWithoutRef<'h1'>) => (
          <h1
            className={`mb-3 mt-5 flex items-center gap-2 border-b ${borderColor} pb-2 text-2xl font-bold ${textColor}`}
            {...props}
          >
            {children}
          </h1>
        ),
        h2: ({ children, ...props }: React.ComponentPropsWithoutRef<'h2'>) => (
          <h2 className={`mb-2 mt-4 flex items-center gap-2 text-xl font-bold ${textColor}`} {...props}>
            <span className={`inline-block h-5 w-1 rounded-sm bg-[#FF9800]`}></span>
            {children}
          </h2>
        ),
        h3: ({ children, ...props }: React.ComponentPropsWithoutRef<'h3'>) => (
          <h3 className={`mb-1.5 mt-3 text-lg font-bold ${textColor}`} {...props}>
            {children}
          </h3>
        ),
        h4: ({ children, ...props }: React.ComponentPropsWithoutRef<'h4'>) => (
          <h4 className={`mb-1.5 mt-3 text-base font-semibold ${textColor}`} {...props}>
            {children}
          </h4>
        ),
        h5: ({ children, ...props }: React.ComponentPropsWithoutRef<'h5'>) => (
          <h5 className={`mb-1 mt-2 text-sm font-semibold ${textColor}`} {...props}>
            {children}
          </h5>
        ),
        h6: ({ children, ...props }: React.ComponentPropsWithoutRef<'h6'>) => (
          <h6 className={`mb-1 mt-2 text-sm font-medium ${textColor}`} {...props}>
            {children}
          </h6>
        ),
        strong: ({ children, ...props }: React.ComponentPropsWithoutRef<'strong'>) => (
          <strong className={`font-bold ${textColor}`} {...props}>
            {children}
          </strong>
        ),
        ul: ({ children, ...props }: React.ComponentPropsWithoutRef<'ul'>) => (
          <ul className={`list-disc pl-6 mb-3 ${secondaryTextColor}`} {...props}>
            {children}
          </ul>
        ),
        ol: ({ children, ...props }: React.ComponentPropsWithoutRef<'ol'>) => (
          <ol className={`list-decimal pl-6 mb-3 ${secondaryTextColor}`} {...props}>
            {children}
          </ol>
        ),
        li: ({
          children,
          ...props
        }: React.ComponentPropsWithoutRef<'li'> & { ordered?: boolean }) => {
          return (
            <li className={`mb-1.5 ${secondaryTextColor}`} {...props}>
              {children}
            </li>
          );
        },
        p: ({ children, ...props }: React.ComponentPropsWithoutRef<'p'>) => (
          <p className={`mb-3 leading-relaxed ${secondaryTextColor}`} {...props}>
            {children}
          </p>
        ),
        a: ({ children, ...props }: React.ComponentPropsWithoutRef<'a'>) => (
          <a className={`${linkColor} underline font-medium hover:opacity-80 transition-opacity`} target="_blank" rel="noopener noreferrer" {...props}>
            {children}
          </a>
        ),
        blockquote: ({ children, ...props }: React.ComponentPropsWithoutRef<'blockquote'>) => (
          <blockquote
            className={`my-3 rounded-r-lg border-l-4 border-[#FF9800] ${blockquoteBg} px-4 py-3 italic ${blockquoteText}`}
            {...props}
          >
            {children}
          </blockquote>
        ),
        table: ({ children, ...props }: React.ComponentPropsWithoutRef<'table'>) => (
          <div className={`my-5 w-full overflow-x-auto rounded-lg border ${tableBorder} not-prose align-middle shadow-sm sm:rounded-lg`}>
            <table className={`min-w-full divide-y ${isDark ? 'divide-[#444]' : 'divide-gray-200'} text-sm`} {...props}>
              {children}
            </table>
          </div>
        ),
        thead: ({ children, ...props }: React.ComponentPropsWithoutRef<'thead'>) => (
          <thead className={theadBg} {...props}>
            {children}
          </thead>
        ),
        tbody: ({ children, ...props }: React.ComponentPropsWithoutRef<'tbody'>) => (
          <tbody className={`divide-y ${isDark ? 'divide-[#333]' : 'divide-gray-200'} ${isDark ? 'bg-transparent' : 'bg-white'}`} {...props}>
            {children}
          </tbody>
        ),
        tr: ({ children, ...props }: React.ComponentPropsWithoutRef<'tr'>) => (
          <tr className={`hover:bg-black/5 transition-colors`} {...props}>
            {children}
          </tr>
        ),
        th: ({ children, ...props }: React.ComponentPropsWithoutRef<'th'>) => (
          <th
            className={`px-4 py-3.5 text-left font-semibold ${thText} whitespace-nowrap`}
            {...props}
          >
            {children}
          </th>
        ),
        td: ({ children, ...props }: React.ComponentPropsWithoutRef<'td'>) => (
          <td className={`px-4 py-3 text-left ${secondaryTextColor} align-top whitespace-normal`} {...props}>
            {children}
          </td>
        ),
        pre: ({ children, ...props }: React.ComponentPropsWithoutRef<'pre'>) => (
          <pre
            className={`p-4 rounded-lg my-4 overflow-x-auto text-sm font-mono leading-relaxed ${isDark ? 'bg-[#1E1E1E] text-gray-200 border border-[#333]' : 'bg-white border border-orange-100 text-gray-800 shadow-sm'}`}
            {...props}
          >
            {children}
          </pre>
        ),
        code: ({ inline, className, children, ...props }: React.ComponentPropsWithoutRef<'code'> & { inline?: boolean }) => {
          const match = /language-(\w+)/.exec(className || '');
          if (!inline && match && match[1] === 'mermaid') {
            return <MermaidChart chart={String(children).replace(/\n$/, '')} />;
          }
          if (inline) {
            return (
              <code className={`px-1.5 py-0.5 rounded-md text-sm bg-black/5 ${textColor} font-mono`} {...props}>
                {children}
              </code>
            );
          }
          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );

  return result;
};

export { MarkdownContent };
