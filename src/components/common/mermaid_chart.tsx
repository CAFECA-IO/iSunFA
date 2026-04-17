'use client';

import { useEffect, useState, FC } from 'react';

import mermaid from 'mermaid';

interface IMermaidChartProps {
  chart: string;
}

const MermaidChart: FC<IMermaidChartProps> = ({ chart }) => {
  const [svgStr, setSvgStr] = useState<string>('');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Info: (20260327 - Tzuhan) Ensure rendering only happens on the client
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
    });

    const renderChart = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvgStr(svg);
        setHasError(false);
      } catch (error) {
        console.error('Mermaid rendering failed', error);
        setHasError(true);
      }
    };

    if (chart && typeof window !== 'undefined') {
      renderChart();
    }
  }, [chart]);

  if (hasError) {
    return (
      <div className="my-4 p-4 border border-red-500/30 bg-[#1E1E1E] rounded-md overflow-x-auto text-sm">
        <p className="font-semibold text-red-500 mb-2">Mermaid Syntax Error</p>
        <pre className="text-gray-300 whitespace-pre-wrap">{chart}</pre>
      </div>
    );
  }

  if (!svgStr) {
    return <div className="my-6 p-10 flex justify-center text-gray-500 animate-pulse">Rendering Chart...</div>;
  }

  return (
    <div
      className="my-6 flex justify-center w-full overflow-x-auto mermaid-container"
      dangerouslySetInnerHTML={{ __html: svgStr }}
    />
  );
};

export { MermaidChart };
