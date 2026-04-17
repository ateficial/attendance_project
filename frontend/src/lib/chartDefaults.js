import { Chart as ChartJS } from 'chart.js';

let configured = false;

const centerLabelPlugin = {
  id: 'centerLabelPlugin',
  afterDatasetsDraw(chart, _args, pluginOptions) {
    if (chart.config.type !== 'doughnut') return;
    const opts = pluginOptions || {};
    if (opts.display === false) return;

    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta?.data?.[0]) return;

    const total = opts.total ?? chart.data.datasets?.[0]?.data?.reduce((sum, val) => sum + Number(val || 0), 0) ?? 0;
    const title = opts.title || String(total);
    const subtitle = opts.subtitle || 'Records';
    const x = meta.data[0].x;
    const y = meta.data[0].y;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = opts.titleColor || '#0f172a';
    ctx.font = "700 28px Inter, 'Segoe UI', sans-serif";
    ctx.fillText(title, x, y - 8);

    ctx.fillStyle = opts.subtitleColor || '#64748b';
    ctx.font = "500 12px Inter, 'Segoe UI', sans-serif";
    ctx.fillText(subtitle, x, y + 18);
    ctx.restore();
  },
};

export function setupChartDefaults() {
  if (configured) return;
  configured = true;

  ChartJS.defaults.font.family = "Inter, 'Segoe UI', sans-serif";
  ChartJS.defaults.font.size = 12;
  ChartJS.defaults.color = '#475569';
  ChartJS.defaults.maintainAspectRatio = false;
  ChartJS.defaults.plugins.legend.position = 'bottom';
  ChartJS.defaults.plugins.legend.labels.usePointStyle = true;
  ChartJS.defaults.plugins.legend.labels.pointStyle = 'circle';
  ChartJS.defaults.plugins.legend.labels.padding = 20;

  ChartJS.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)';
  ChartJS.defaults.plugins.tooltip.titleColor = '#ffffff';
  ChartJS.defaults.plugins.tooltip.bodyColor = '#cbd5e1';
  ChartJS.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.1)';
  ChartJS.defaults.plugins.tooltip.borderWidth = 1;
  ChartJS.defaults.plugins.tooltip.padding = 10;
  ChartJS.defaults.plugins.tooltip.cornerRadius = 8;
  ChartJS.defaults.plugins.tooltip.usePointStyle = true;

  ChartJS.defaults.scale.grid.color = '#e2e8f0';
  ChartJS.defaults.scale.grid.lineWidth = 1;
  ChartJS.defaults.scale.border.display = false;

  ChartJS.register(centerLabelPlugin);
}
