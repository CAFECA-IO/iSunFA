'use client';

import React, { useEffect, useState, useMemo } from 'react';
import mermaid from 'mermaid';
import { DonutChart, IDonutChartData } from '@/components/common/donut_chart';


interface IMermaidChartProps {
  chart: string;
}

const MermaidChart: React.FC<IMermaidChartProps> = ({ chart }) => {
  const [svgStr, setSvgStr] = useState<string>('');
  const [hasError, setHasError] = useState(false);

  // Info: (20260418 - Tzuhan) Intercept Mermaid Pie charts and render using our premium Recharts Donut instead
  const parsedPieData = useMemo(() => {
    if (!chart || typeof chart !== 'string') return null;
    const cleanChart = chart.trim();
    if (!cleanChart.startsWith('pie')) return null;

    const lines = cleanChart.split('\n');
    let title = '';
    const data: IDonutChartData[] = [];

    lines.forEach((line) => {
      const cleanLine = line.trim();
      if (cleanLine.startsWith('pie title')) {
        title = cleanLine.replace('pie title', '').trim();
      } else if (cleanLine.includes(':')) {
        const parts = cleanLine.split(':');
        if (parts.length >= 2) {
          let name = parts[0].trim();
          if (name.startsWith('"') && name.endsWith('"')) {
            name = name.slice(1, -1);
          }
          // Info: (20260418 - Tzuhan) Use the last part as value, in case there are multiple colons
          const valueStr = parts[parts.length - 1].trim();
          const value = parseFloat(valueStr.replace('%', ''));
          if (!isNaN(value)) {
            data.push({ name, value });
          }
        }
      }
    });

    if (data.length > 0) {
      return { title, data };
    }
    return null;
  }, [chart]);

  useEffect(() => {
    if (parsedPieData) return; // Skip mermaid rendering if we intercepted a pie chart
    // Info: (20260418 - Tzuhan) Applied premium aesthetic color palette for Mermaid charts to avoid muddy default dark theme
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        background: 'transparent',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',

        // Info: (20260418 - Tzuhan) Vibrant Palette for Pie Charts
        pie1: '#4F46E5',
        pie2: '#10B981',
        pie3: '#F59E0B',
        pie4: '#EC4899',
        pie5: '#8B5CF6',
        pie6: '#06B6D4',
        pie7: '#EF4444',
        pie8: '#84CC16',
        pie9: '#F97316',
        pie10: '#3B82F6',

        pieTitleTextSize: '20px',
        pieTitleTextColor: '#1E293B',
        pieSectionTextSize: '15px',
        pieSectionTextColor: '#FFFFFF',
        pieLegendTextSize: '14px',
        pieLegendTextColor: '#475569',
        pieStrokeColor: '#FFFFFF',
        pieStrokeWidth: '3px',
        pieOuterStrokeWidth: '0px',
        pieOuterStrokeColor: 'transparent',
        pieOpacity: '0.95',
      },
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
  }, [chart, parsedPieData]);

  if (parsedPieData) {
    return <DonutChart title={parsedPieData.title} data={parsedPieData.data} />;
  }

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
    <div className="relative w-full break-inside-avoid print:break-inside-avoid">
      <style>{`
        .mermaid-container svg {
          max-width: 100%;
          max-height: 400px !important;
          width: auto;
          height: auto;
          margin: 0 auto;
        }
      `}</style>
      <div
        className="my-6 flex justify-center w-full overflow-x-auto mermaid-container transition-all duration-300 hover:scale-[1.02] cursor-default"
        dangerouslySetInnerHTML={{ __html: svgStr }}
      />
    </div>
  );
};

export { MermaidChart };
