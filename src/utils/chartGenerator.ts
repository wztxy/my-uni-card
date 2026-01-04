import { Chart, registerables } from 'chart.js';
import type { TransactionRecord } from '../types';

Chart.register(...registerables);

// Store chart instances for destruction
const chartInstances: Map<string, Chart> = new Map();

/**
 * Generate all charts
 */
export function generateCharts(data: TransactionRecord[], t: (key: string) => string): void {
  generateCategoryChart(data, t);
  generateTrendChart(data, t);
  generateMonthlyChart(data, t);
  generateHourlyChart(data, t);
}

/**
 * Destroy all charts
 */
export function destroyCharts(): void {
  chartInstances.forEach((chart) => chart.destroy());
  chartInstances.clear();
}

/**
 * Generate category pie chart
 */
function generateCategoryChart(data: TransactionRecord[], t: (key: string) => string): void {
  const categoryMap = new Map<string, number>();

  data.forEach((record) => {
    const amount = Math.abs(record.amount) / 100;
    categoryMap.set(
      record.merName,
      (categoryMap.get(record.merName) || 0) + amount
    );
  });

  const sortedCategories = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1]);

  const topCategories = sortedCategories.slice(0, 8);
  const otherAmount = sortedCategories.slice(8).reduce((sum, item) => sum + item[1], 0);

  if (otherAmount > 0) {
    topCategories.push([t('charts.other'), otherAmount]);
  }

  const labels = topCategories.map((item) => item[0]);
  const amounts = topCategories.map((item) => Number(item[1].toFixed(2)));
  const totalAmount = amounts.reduce((sum, val) => sum + val, 0);

  const ctx = document.getElementById('categoryChart') as HTMLCanvasElement;
  if (!ctx) return;

  if (chartInstances.has('category')) {
    chartInstances.get('category')?.destroy();
  }

  const config = {
    type: 'doughnut' as const,
    data: {
      labels: labels,
      datasets: [{
        data: amounts,
        backgroundColor: [
          '#007AFF', // Blue
          '#34C759', // Green
          '#FF9500', // Orange
          '#FF2D55', // Pink
          '#AF52DE', // Purple
          '#5AC8FA', // Teal
          '#FFCC00', // Yellow
          '#5856D6', // Indigo
          '#8E8E93'  // Gray
        ],
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    plugins: [{
      id: 'doughnutLabels',
      afterDatasetsDraw(chart: Chart) {
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, i) => {
          const meta = chart.getDatasetMeta(i);
          meta.data.forEach((element: any, index) => {
            const value = dataset.data[index] as number;
            const percentage = ((value / totalAmount) * 100).toFixed(1);
            
            if (Number(percentage) > 3) {
              const { x, y } = element.tooltipPosition();
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              
              ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
              ctx.shadowBlur = 4;
              ctx.fillText(`${percentage}%`, x, y);
              ctx.shadowBlur = 0;
            }
          });
        });
      }
    }],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: { size: 11, family: '-apple-system, BlinkMacSystemFont, sans-serif' },
            padding: 12,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (context: any) => {
              const value = context.raw as number;
              const percentage = ((value / totalAmount) * 100).toFixed(1);
              return `¥${value.toFixed(2)} (${percentage}%)`;
            }
          }
        }
      }
    }
  };

  const chart = new Chart(ctx, config as any);
  chartInstances.set('category', chart);
}

/**
 * Generate daily trend chart
 */
function generateTrendChart(data: TransactionRecord[], t: (key: string) => string): void {
  const dailyMap = new Map<string, number>();

  data.forEach((record) => {
    const date = record.date.split(' ')[0];
    const amount = Math.abs(record.amount) / 100;
    dailyMap.set(date, (dailyMap.get(date) || 0) + amount);
  });

  const sortedData = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));

  let displayData = sortedData;
  if (sortedData.length > 60) {
    const step = Math.ceil(sortedData.length / 60);
    displayData = sortedData.filter((_, i) => i % step === 0);
  }

  const labels = displayData.map((item) => item[0].slice(5)); // Show MM-DD only
  const amounts = displayData.map((item) => Number(item[1].toFixed(2)));

  const ctx = document.getElementById('trendChart') as HTMLCanvasElement;
  if (!ctx) return;

  if (chartInstances.has('trend')) {
    chartInstances.get('trend')?.destroy();
  }

  const config = {
    type: 'line' as const,
    data: {
      labels: labels,
      datasets: [{
        label: t('charts.dailyConsumption'),
        data: amounts,
        borderColor: '#007AFF',
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: displayData.length > 30 ? 0 : 3,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (context: any) => `${t('charts.consumption')}: ¥${context.raw}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxRotation: 45, font: { size: 10 } }
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: any) => `¥${value}`
          }
        }
      }
    }
  };

  const chart = new Chart(ctx, config as any);
  chartInstances.set('trend', chart);
}

/**
 * Generate monthly bar chart
 */
function generateMonthlyChart(data: TransactionRecord[], t: (key: string) => string): void {
  const monthlyMap = new Map<string, number>();

  data.forEach((record) => {
    const month = record.date.slice(0, 7); // YYYY-MM
    const amount = Math.abs(record.amount) / 100;
    monthlyMap.set(month, (monthlyMap.get(month) || 0) + amount);
  });

  const sortedData = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));

  const labels = sortedData.map((item) => item[0]);
  const amounts = sortedData.map((item) => Number(item[1].toFixed(2)));

  const ctx = document.getElementById('monthlyChart') as HTMLCanvasElement;
  if (!ctx) return;

  if (chartInstances.has('monthly')) {
    chartInstances.get('monthly')?.destroy();
  }

  const config = {
    type: 'bar' as const,
    data: {
      labels: labels,
      datasets: [{
        label: t('charts.monthlyConsumption'),
        data: amounts,
        backgroundColor: 'rgba(0, 122, 255, 0.8)',
        borderColor: '#007AFF',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    plugins: [{
      id: 'topLabels',
      afterDatasetsDraw(chart: Chart) {
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, i) => {
          const meta = chart.getDatasetMeta(i);
          meta.data.forEach((bar: any, index) => {
            const value = dataset.data[index] as number;
            if (value > 0) {
              ctx.fillStyle = '#8E8E93';
              ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'bottom';
              ctx.fillText(value.toFixed(0), bar.x, bar.y - 5);
            }
          });
        });
      }
    }],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (context: any) => `${t('charts.consumption')}: ¥${context.raw}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: any) => `¥${value}`
          }
        }
      }
    }
  };

  const chart = new Chart(ctx, config as any);
  chartInstances.set('monthly', chart);
}

/**
 * Generate 24h distribution chart
 */
function generateHourlyChart(data: TransactionRecord[], t: (key: string) => string): void {
  const hourlyStats = new Array(24).fill(0);

  data.forEach((record) => {
    const hour = new Date(record.date.replace(/-/g, '/')).getHours();
    if (!isNaN(hour)) {
      hourlyStats[hour]++;
    }
  });

  const labels = Array.from({ length: 24 }, (_, i) => `${i}${t('report.hour')}`);

  const ctx = document.getElementById('hourlyChart') as HTMLCanvasElement;
  if (!ctx) return;

  if (chartInstances.has('hourly')) {
    chartInstances.get('hourly')?.destroy();
  }

  const config = {
    type: 'bar' as const,
    data: {
      labels: labels,
      datasets: [{
        label: t('charts.frequency'),
        data: hourlyStats,
        backgroundColor: (context: any) => {
          const idx = context.dataIndex;
          if (idx >= 6 && idx <= 9) return '#FF9500'; // Breakfast (Orange)
          if (idx >= 11 && idx <= 13) return '#FF3B30'; // Lunch (Red)
          if (idx >= 17 && idx <= 20) return '#007AFF'; // Dinner (Blue)
          return '#C7C7CC';
        },
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (context: any) => `${t('stats.consumptionCount')}: ${context.raw}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  };

  const chart = new Chart(ctx, config as any);
  chartInstances.set('hourly', chart);
}
