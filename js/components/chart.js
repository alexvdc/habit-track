// js/components/chart.js — SVG bar chart (V2 style)

/**
 * Generates an SVG bar chart.
 * @param {Array<{date: string, count: number}>} data
 * @param {object} [opts]
 * @param {number} [opts.width=560]
 * @param {number} [opts.height=180]
 * @param {string} [opts.todayDate] - ISO date to highlight as "today"
 * @returns {string} SVG markup
 */
export function barChart(data, opts = {}) {
  const width = opts.width || 560;
  const height = opts.height || 180;
  const todayDate = opts.todayDate || '';
  const pad = { top: 20, right: 20, bottom: 36, left: 40 };

  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const gap = 4;
  const barW = Math.max((chartW / data.length) - gap, 4);

  // Accessibility summary
  const totalCheckins = data.reduce((sum, d) => sum + d.count, 0);
  const avgCheckins = data.length > 0 ? (totalCheckins / data.length).toFixed(1) : 0;
  const todayData = data.find(d => d.date === todayDate);
  const summaryText = `Graphique des check-ins sur ${data.length} jours. Total : ${totalCheckins} check-ins, moyenne : ${avgCheckins} par jour${todayData ? `, aujourd'hui : ${todayData.count}` : ''}.`;

  // Grid lines
  let gridLines = '';
  for (let v = 0; v <= maxCount; v++) {
    const y = pad.top + chartH - (v / maxCount) * chartH;
    gridLines += `<line class="chart-grid" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"/>`;
    gridLines += `<text class="chart-label" x="${pad.left - 8}" y="${y + 4}" text-anchor="end">${v}</text>`;
  }

  // Axis line
  const axisY = pad.top + chartH;
  const axisLine = `<line class="chart-axis" x1="${pad.left}" y1="${axisY}" x2="${width - pad.right}" y2="${axisY}"/>`;

  // Bars + labels
  let bars = '';
  let labels = '';
  data.forEach((d, i) => {
    const x = pad.left + i * (barW + gap) + gap / 2;
    const barH = maxCount > 0 ? (d.count / maxCount) * chartH : 0;
    const y = pad.top + chartH - barH;
    const isToday = d.date === todayDate;
    const cls = isToday ? 'chart-bar-today' : 'chart-bar';

    bars += `<rect class="${cls}" x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4"><title>${formatLabel(d.date)} — ${d.count}</title></rect>`;
    if (isToday) {
      bars += `<text class="chart-today-label" x="${x + barW / 2}" y="${Math.max(y - 6, pad.top)}" text-anchor="middle">Auj.</text>`;
    }

    // Show labels sparsely
    if (i % Math.ceil(data.length / 5) === 0 || i === data.length - 1) {
      const day = d.date.slice(8);
      labels += `<text class="chart-label" x="${x + barW / 2}" y="${axisY + 16}" text-anchor="middle">${parseInt(day, 10)}</text>`;
    }
  });

  // Month label
  if (data.length > 0) {
    const mid = data[Math.floor(data.length / 2)];
    const monthName = getMonthName(mid.date);
    labels += `<text class="chart-label" x="${width / 2}" y="${height - 2}" text-anchor="middle" style="font-size:10px">${monthName}</text>`;
  }

  return `
    <div class="chart-wrap">
      <p class="sr-only">${summaryText}</p>
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${gridLines}
        ${axisLine}
        ${bars}
        ${labels}
      </svg>
    </div>`;
}

function formatLabel(isoDate) {
  const months = ['janv.','fév.','mars','avril','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
  const [, m, d] = isoDate.split('-').map(Number);
  return `${d} ${months[m - 1]}`;
}

function getMonthName(isoDate) {
  const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const [y, m] = isoDate.split('-').map(Number);
  return `${months[m - 1]} ${y}`;
}
