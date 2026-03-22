// js/components/chart.js

export function barChart(data, opts = {}) {
  const width = opts.width || 600;
  const height = opts.height || 200;
  const barColor = opts.barColor || 'var(--color-present, #4CAF50)';
  const padding = { top: 20, right: 10, bottom: 30, left: 30 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const barW = Math.max(chartW / data.length - 2, 2);

  let bars = '';
  let labels = '';

  data.forEach((d, i) => {
    const x = padding.left + (i * (chartW / data.length)) + 1;
    const barH = (d.count / maxCount) * chartH;
    const y = padding.top + chartH - barH;

    bars += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${barColor}" rx="2">
      <title>${d.date}: ${d.count}</title>
    </rect>`;

    if (i % 7 === 0) {
      const label = d.date.slice(5);
      labels += `<text x="${x}" y="${height - 5}" font-size="10" fill="var(--color-text-muted, #888)">${label}</text>`;
    }
  });

  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart-svg" style="width:100%;max-width:${width}px;height:auto;">
      ${bars}
      ${labels}
      <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="var(--color-border, #ddd)" />
    </svg>
  `;
}
