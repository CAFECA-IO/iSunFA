import { NextRequest, NextResponse } from 'next/server';

interface IRadarData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
}

interface IChartConfig {
  type: 'radar';
  data: IRadarData;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const configStr = searchParams.get('c');

  if (!configStr) {
    return NextResponse.json({ error: 'Missing config parameter "c"' }, { status: 400 });
  }

  try {
    /**
     * Info: (20260120 - Luphia) Parse loose JSON
     * allow single quotes and unquoted keys if simple
     * For safety, we try standard JSON.parse first, then a relaxed replacement.
     */
    let config: IChartConfig;
    try {
      config = JSON.parse(configStr);
    } catch {
      /**
       * Info: (20260120 - Luphia) Very basic loose parsing
       * replace single quotes with double quotes
       * Note: This is not robust for all cases but handles the user's specific example
       */
      const jsonStr = configStr.replace(/'/g, '"').replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
      config = JSON.parse(jsonStr);
    }

    if (config.type !== 'radar' || !config.data) {
      return NextResponse.json({ error: 'Invalid chart config' }, { status: 400 });
    }

    const svg = generateRadarSVG(config.data);

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Chart generation failed:', error);
    return NextResponse.json({ error: 'Failed to generate chart', details: String(error) }, { status: 500 });
  }
}

function generateRadarSVG(data: IRadarData): string {
  const width = 500;
  const height = 400;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 60;
  const levels = 5;
  const labelCount = data.labels.length;
  const angleSlice = (Math.PI * 2) / labelCount;

  // Info: (20260120 - Luphia) Colors
  const axisColor = '#e5e7eb';
  const gridColor = '#e5e7eb';
  const labelColor = '#374151';
  const defaultColors = ['rgba(234, 88, 12, 0.5)', 'rgba(59, 130, 246, 0.5)'];
  const defaultStrokes = ['rgb(234, 88, 12)', 'rgb(59, 130, 246)'];

  let svgContent = '';

  // Info: (20260120 - Luphia) Draw Grid (Concentric Polygons)
  for (let level = 0; level <= levels; level++) {
    const r = (radius / levels) * level;
    let points = '';
    for (let i = 0; i < labelCount; i++) {
      const angle = angleSlice * i - Math.PI / 2;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      points += `${x},${y} `;
    }
    if (level > 0) {
      svgContent += `<polygon points="${points.trim()}" fill="none" stroke="${gridColor}" stroke-width="1" />`;
    }
  }

  // Info: (20260120 - Luphia) Draw Axes and Labels
  for (let i = 0; i < labelCount; i++) {
    const angle = angleSlice * i - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    // Info: (20260120 - Luphia) Axis line
    svgContent += `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="${axisColor}" stroke-width="1" />`;

    // Info: (20260120 - Luphia) Label
    const labelX = centerX + (radius + 30) * Math.cos(angle);
    const labelY = centerY + (radius + 20) * Math.sin(angle);
    const label = data.labels[i];

    // Info: (20260120 - Luphia) Simple text anchoring based on position
    let anchor = 'middle';
    if (Math.abs(Math.cos(angle)) > 0.1) {
      anchor = Math.cos(angle) > 0 ? 'start' : 'end';
    }

    svgContent += `<text x="${labelX}" y="${labelY}" fill="${labelColor}" font-size="12" font-family="sans-serif" text-anchor="${anchor}" alignment-baseline="middle">${label}</text>`;
  }

  // Info: (20260120 - Luphia) Draw Data
  data.datasets.forEach((dataset, idx) => {
    /**
     * Info: (20260120 - Luphia) Normalize data
     * assuming max value 100 for now, or find max
     * Ideally find global max across all datasets
     */
    const allValues = data.datasets.flatMap(d => d.data);
    const maxVal = Math.max(...allValues, 100);

    let points = '';
    dataset.data.forEach((val, i) => {
      const normalizedVal = val / maxVal;
      const r = radius * normalizedVal;
      const angle = angleSlice * i - Math.PI / 2;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      points += `${x},${y} `;
    });

    const fillColor = dataset.backgroundColor || defaultColors[idx % defaultColors.length];
    const strokeColor = dataset.borderColor || defaultStrokes[idx % defaultStrokes.length];

    svgContent += `<polygon points="${points.trim()}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" fill-opacity="0.5" />`;
  });

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white" />
      ${svgContent}
    </svg>
  `;
}
