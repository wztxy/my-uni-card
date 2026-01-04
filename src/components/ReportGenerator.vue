<template>
  <div class="report-container">
    <!-- Controls -->
    <div class="report-controls">
      <div class="control-group">
        <label>{{ t('report.type') }}</label>
        <select v-model="reportType" class="auto-width-select">
          <option value="calendar">{{ t('report.calendarYear') }}</option>
          <option value="academic">{{ t('report.academicYear') }}</option>
        </select>
      </div>

      <div class="control-group">
        <label for="year-select">{{ t('report.selectTime') }}</label>
        <select id="year-select" v-model="selectedYear" class="auto-width-select">
          <option v-for="item in availableYears" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </div>

      <div class="control-group" v-if="reportType === 'academic'">
        <label>{{ t('report.academicStart') }}</label>
        <div class="date-inputs">
          <select v-model="academicStartMonth" class="month-select">
            <option :value="7">{{ t('report.monthName.7') }}</option>
            <option :value="8">{{ t('report.monthName.8') }}</option>
          </select>
          <span class="date-separator"></span>
          <div class="day-input-wrapper">
            <select v-model="academicStartDay" class="day-select">
              <option v-for="d in 31" :key="d" :value="d">{{ d }}{{ t('report.daySuffix') }}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="control-group">
        <label class="toggle-label">
          <input type="checkbox" v-model="showPersonalInfo">
          <span class="toggle-text">{{ t('report.showPersonalInfo') }}</span>
        </label>
      </div>

      <div class="control-group">
        <label class="toggle-label">
          <input type="checkbox" v-model="showShowerStats">
          <span class="toggle-text">{{ t('report.showerStats') }}</span>
        </label>
      </div>

      <button @click="fetchData" class="btn btn-primary" :disabled="isLoading">
        <span v-if="isLoading" class="spinner"></span>
        {{ isLoading ? t('report.loading') : t('report.fetchData') }}
      </button>

      <button
        v-if="reportData.length > 0"
        @click="exportReport"
        class="btn btn-success"
        :disabled="isExporting"
      >
        {{ isExporting ? t('report.exporting') : t('report.exportReport') }}
      </button>

      <button
        v-if="reportData.length > 0"
        @click="exportJSON"
        class="btn btn-secondary"
        :disabled="isExporting"
      >
        {{ t('report.exportJSON') }}
      </button>
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>

    <!-- Report Content -->
    <div v-if="reportData.length > 0" class="report-content" ref="reportRef">
      <div class="report-header">
        <h2>{{ t('report.reportTitle') }}</h2>
        <p class="subtitle" v-if="showPersonalInfo">
          {{ props.userInfo.stuNo }} {{ props.userInfo.name }} · {{ reportTitle }}
        </p>
        <p class="subtitle" v-else>
          {{ reportTitle }}
        </p>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-card-title">{{ t('stats.consumptionCount') }}</span>
            <span class="stat-value">{{ reportData.length }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-card-title">{{ t('stats.totalAmount') }}</span>
            <span class="stat-value">¥{{ formatAmount(Math.abs(totalAmount)) }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-card-title">{{ t('stats.averageAmount') }}</span>
            <span class="stat-value">¥{{ averageAmount }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-card-title">{{ t('stats.balance') }}</span>
            <span class="stat-value">¥{{ formatAmount(lastBalance) }}</span>
          </div>
        </div>

        <!-- Recharge Stats -->
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-card-title">{{ t('stats.rechargeCount') }}</span>
            <span class="stat-value">{{ rechargeStats.count }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-card-title">{{ t('stats.totalRecharge') }}</span>
            <span class="stat-value">¥{{ rechargeStats.total }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-card-title">{{ t('stats.averageRecharge') }}</span>
            <span class="stat-value">¥{{ rechargeStats.average }}</span>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-section">
        <div class="chart-card">
          <h3>{{ t('charts.locationDistribution') }}</h3>
          <div class="chart-wrapper">
            <canvas id="categoryChart"></canvas>
          </div>
        </div>

        <div class="chart-card">
          <h3>{{ t('charts.monthlyStats') }}</h3>
          <div class="chart-wrapper">
            <canvas id="monthlyChart"></canvas>
          </div>
        </div>

        <div class="chart-card full-width">
          <h3>{{ t('charts.dailyTrend') }}</h3>
          <div class="chart-wrapper wide">
            <canvas id="trendChart"></canvas>
          </div>
        </div>

        <div class="chart-card">
          <h3>{{ t('charts.hourlyDistribution') }}</h3>
          <div class="chart-wrapper">
            <canvas id="hourlyChart"></canvas>
          </div>
        </div>

        <div class="chart-card" v-if="showShowerStats">
          <h3>{{ t('report.showerStats') }}</h3>
          <div class="shower-stats-content">
            <div class="shower-stat-item">
              <span class="stat-label">{{ t('stats.showerCount') }}</span>
              <span class="stat-value">{{ showerStats.count }}</span>
            </div>
            <div class="shower-stat-item">
              <span class="stat-label">{{ t('stats.totalCost') }}</span>
              <span class="stat-value">¥{{ showerStats.total }}</span>
            </div>
            <div class="shower-stat-item">
              <span class="stat-label">{{ t('stats.averageFrequency') }}</span>
              <div class="stat-value-group">
                <span class="stat-value">{{ showerStats.frequency }}</span>
                <span class="stat-hint">{{ t('stats.referenceOnly') }}</span>
              </div>
            </div>
            <div class="shower-stat-item">
              <span class="stat-label">{{ t('stats.averagePerTime') }}</span>
              <span class="stat-value">¥{{ showerStats.average }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Transaction Details -->
      <div class="details-section" data-html2canvas-ignore="true">
        <div class="details-header-row">
          <h3>{{ t('details.title') }}</h3>
          <div class="page-size-selector">
            <label>{{ t('details.pageSize') }}：</label>
            <select v-model="pageSize">
              <option :value="10">10{{ t('details.items') }}</option>
              <option :value="20">20{{ t('details.items') }}</option>
              <option :value="30">30{{ t('details.items') }}</option>
              <option :value="50">50{{ t('details.items') }}</option>
              <option :value="100">100{{ t('details.items') }}</option>
              <option :value="200">200{{ t('details.items') }}</option>
              <option :value="500">500{{ t('details.items') }}</option>
            </select>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="details-table">
            <thead>
              <tr>
                <th>{{ t('details.time') }}</th>
                <th>{{ t('details.merchant') }}</th>
                <th>{{ t('details.amount') }}</th>
                <th>{{ t('details.balance') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in paginatedData" :key="index">
                <td>{{ item.date }}</td>
                <td>{{ item.merName }}</td>
                <td class="amount-cell">-¥{{ formatAmount(Math.abs(item.amount)) }}</td>
                <td>¥{{ formatAmount(item.balance) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="reportData.length > pageSize" class="pagination">
          <button @click="currentPage--" :disabled="currentPage === 1" class="page-btn">
            {{ t('details.prevPage') }}
          </button>
          <span class="page-info">
            {{ t('details.pageInfo', { page: currentPage, total: totalPages }) }}
          </span>
          <button @click="currentPage++" :disabled="currentPage === totalPages" class="page-btn">
            {{ t('details.nextPage') }}
          </button>
        </div>
      </div>

      <div class="report-footer">
        <p>{{ t('report.generatedTime') }}{{ new Date().toLocaleString() }}</p>
        <div class="report-promo">
          <img :src="githubQrImage" alt="GitHub QR Code" class="promo-qr" />
          <div class="promo-text">
            <span class="promo-title">MyCampusCard</span>
            <a href="https://github.com/wztxy/MyCampusCard" class="promo-link">https://github.com/wztxy/MyCampusCard</a>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!isLoading" class="empty-state">
      <p>{{ t('report.emptyState') }}</p>
      <p class="empty-hint">{{ t('report.emptyHint') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { generateCharts, destroyCharts } from '../utils/chartGenerator';
import { exportToImage } from '../utils/imageExporter';
import type { TransactionRecord } from '../types';
import githubQrImage from '../../assets/github-qr.png';

interface Props {
  userInfo: {
    stuNo: string;
    name: string;
    sessionId: string;
  };
}

const props = defineProps<Props>();
const { t } = useI18n();

const reportType = ref<'calendar' | 'academic'>('calendar');
const academicStartMonth = ref(8);
const academicStartDay = ref(1);

const selectedYear = ref(new Date().getFullYear());
const availableYears = computed(() => {
  const currentYear = new Date().getFullYear();
  const years: { label: string; value: number }[] = [];
  
  for (let i = currentYear; i >= currentYear - 5; i--) {
    if (reportType.value === 'calendar') {
      years.push({ label: `${i} ${t('report.yearSuffix')}`, value: i });
    } else {
      years.push({ label: `${i}-${i + 1}`, value: i });
    }
  }
  return years;
});

const reportTitle = computed(() => {
  if (reportType.value === 'calendar') {
    return `${selectedYear.value}${t('report.yearSuffix')}`;
  } else {
    return `${selectedYear.value}-${selectedYear.value + 1}${t('report.yearSuffix')}`;
  }
});

const reportData = ref<TransactionRecord[]>([]);
const allRecords = ref<TransactionRecord[]>([]); 
const isLoading = ref(false);
const isExporting = ref(false);
const errorMessage = ref('');
const reportRef = ref<HTMLElement>();
const showPersonalInfo = ref(true);

// Module toggles
const showShowerStats = ref(false);

// Clear report data when settings change
watch([reportType, selectedYear, academicStartMonth, academicStartDay], () => {
  reportData.value = [];
  destroyCharts();
});

// Shower Stats
const showerStats = computed(() => {
  const data = reportData.value.filter(r => r.merName.includes('浴室'));
  const count = data.length;
  const total = Math.abs(data.reduce((sum, r) => sum + r.amount, 0));
  
  let frequency = 'N/A';
  if (count > 1) {
    const dates = data.map(r => new Date(r.date).getTime()).sort((a, b) => a - b);
    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const diffTime = dates[i] - dates[i - 1];
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      intervals.push(diffDays);
    }

    // Calculate dynamic baseline
    // Exclude ranges: 12.31-3.10, 4.30-5.5, 6.15-9.15, 9.30-10.8
    const isExcluded = (timestamp: number) => {
      const d = new Date(timestamp);
      const month = d.getMonth() + 1; // 1-12
      const day = d.getDate();
      if ((month === 12 && day >= 31) || (month <= 2) || (month === 3 && day <= 10)) return true;
      if ((month === 4 && day >= 30) || (month === 5 && day <= 5)) return true;
      if ((month === 6 && day >= 15) || (month === 7) || (month === 8) || (month === 9 && day <= 15)) return true;
      if ((month === 9 && day >= 30) || (month === 10 && day <= 8)) return true;
      return false;
    };

    const validDates = dates.filter(ts => !isExcluded(ts));

    let baselineDays = 7; 
    
    if (validDates.length > 1) {
      const validIntervals: number[] = [];
      for (let i = 1; i < validDates.length; i++) {
        const diffTime = validDates[i] - validDates[i - 1];
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        if (diffDays < 30) {
          validIntervals.push(diffDays);
        }
      }
      
      if (validIntervals.length > 0) {
        const avgInterval = validIntervals.reduce((a, b) => a + b, 0) / validIntervals.length;
        baselineDays = avgInterval + 0.2;
      }
    }

    let totalAdjustedDays = 0;
    
    intervals.forEach(diff => {
      if (diff > baselineDays + 1) {
        totalAdjustedDays += baselineDays;
      } else {
        totalAdjustedDays += diff;
      }
    });
    const daysPerTime = totalAdjustedDays / (count - 1);
    frequency = `${daysPerTime.toFixed(1)}${t('stats.frequencyUnit')}`;
  }

  return {
    count,
    total: (total / 100).toFixed(2),
    average: count ? (total / 100 / count).toFixed(2) : '0.00',
    frequency
  };
});

// Recharge Stats
const rechargeStats = computed(() => {
  const data = allRecords.value.filter(r => 
    (r.amount > 0 && !r.merName.includes('退款')) || 
    r.merName.includes('充值') || 
    r.merName.includes('圈存')
  );
  const count = data.length;
  const total = data.reduce((sum, r) => sum + r.amount, 0);
  return {
    count,
    total: (total / 100).toFixed(2),
    average: count ? (total / 100 / count).toFixed(2) : '0.00'
  };
});

// Pagination
const currentPage = ref(1);
const pageSize = ref(30);

const totalPages = computed(() => {
  return Math.ceil(reportData.value.length / pageSize.value);
});

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return reportData.value.slice(start, end);
});

// Convert amount (cent -> yuan)
const formatAmount = (amount: number) => {
  return (amount / 100).toFixed(2);
};

const totalAmount = computed(() => {
  return reportData.value.reduce((sum, item) => sum + item.amount, 0);
});

const averageAmount = computed(() => {
  if (reportData.value.length === 0) return '0.00';
  return (Math.abs(totalAmount.value) / 100 / reportData.value.length).toFixed(2);
});

const lastBalance = computed(() => {
  if (reportData.value.length === 0) return 0;
  return reportData.value[0].balance;
});

const fetchData = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  destroyCharts();

  try {
    let minDate: string;
    let maxDate: string;

    if (reportType.value === 'calendar') {
      minDate = `${selectedYear.value}-01-01T00:00:00.000`;
      maxDate = `${selectedYear.value}-12-31T23:59:59.999`;
    } else {
      const startY = selectedYear.value;
      const endY = selectedYear.value + 1;
      const m = String(academicStartMonth.value).padStart(2, '0');
      const d = String(academicStartDay.value).padStart(2, '0');
      const startDateObj = new Date(startY, academicStartMonth.value - 1, academicStartDay.value);
      const endDateObj = new Date(endY, academicStartMonth.value - 1, academicStartDay.value);
      endDateObj.setDate(endDateObj.getDate() - 1);
      
      const endM = String(endDateObj.getMonth() + 1).padStart(2, '0');
      const endD = String(endDateObj.getDate()).padStart(2, '0');

      minDate = `${startY}-${m}-${d}T00:00:00.000`;
      maxDate = `${endY}-${endM}-${endD}T23:59:59.999`;
    }
    const stuNo = String(props.userInfo.stuNo ?? '');
    const sessionId = String(props.userInfo.sessionId ?? '');

    if (window.electronAPI?.fetchCardData) {
      const result = await window.electronAPI.fetchCardData(
        minDate,
        maxDate,
        stuNo,
        sessionId
      );

      if (result.success && result.data) {
        allRecords.value = result.data;
        const filteredData = result.data
          .filter((record: TransactionRecord) => record.amount < 0)
          .sort((a: TransactionRecord, b: TransactionRecord) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          });

        reportData.value = filteredData;

        if (filteredData.length === 0) {
          errorMessage.value = t('error.noRecords');
          return;
        }

        await nextTick();
        generateCharts(filteredData, t);
      } else {
        errorMessage.value = result.error || t('error.fetchFailed');
      }
    } else {
      errorMessage.value = t('error.notElectron');
    }
  } catch (error: any) {
    errorMessage.value = error.message || t('error.fetchError');
    console.error('Fetch error:', error);
  } finally {
    isLoading.value = false;
  }
};

const exportReport = async () => {
  if (!reportRef.value) return;

  isExporting.value = true;
  errorMessage.value = '';
  
  try {
    const filename = `${t('report.filenamePrefixImage')}_${props.userInfo.stuNo}_${reportTitle.value}.png`;
    await exportToImage(reportRef.value, filename);
  } catch (error: any) {
    errorMessage.value = error.message || t('report.exportFailed');
    console.error('Export error:', error);
  } finally {
    isExporting.value = false;
  }
};

const exportJSON = async () => {
  if (reportData.value.length === 0) return;

  isExporting.value = true;
  errorMessage.value = '';

  try {
    const filename = `${t('report.filenamePrefixJson')}_${props.userInfo.stuNo}_${reportTitle.value}.json`;
    
    const dataToExport = JSON.parse(JSON.stringify(reportData.value));

    if (window.electronAPI?.saveJSON) {
      const result = await window.electronAPI.saveJSON(dataToExport, filename);
      if (!result.success && result.error) {
        throw new Error(result.error);
      }
    } else {
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  } catch (error: any) {
    errorMessage.value = error.message || '导出 JSON 失败';
    console.error('Export JSON error:', error);
  } finally {
    isExporting.value = false;
  }
};

onUnmounted(() => {
  destroyCharts();
});
</script>

<style scoped>
.report-container {
  width: 100%;
  max-width: 1100px;
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.report-controls {
  padding: 20px 24px;
  background: rgba(249, 249, 249, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-group label {
  color: #1d1d1f;
  font-weight: 500;
  font-size: 13px;
}

.control-group select {
  padding: 6px 12px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  font-size: 13px;
  background: white;
  cursor: pointer;
  color: #1d1d1f;
  outline: none;
  transition: border-color 0.2s;
}

.control-group select:focus {
  border-color: #007aff;
}

.auto-width-select {
  width: auto;
  min-width: 80px;
  padding-right: 32px;
}

.date-inputs {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  padding: 2px;
  transition: border-color 0.2s;
}

.date-inputs:focus-within {
  border-color: #007aff;
}

.month-select, .day-select {
  border: none !important;
  background: transparent !important;
  padding: 4px 8px !important;
  font-size: 13px;
  color: #1d1d1f;
  outline: none;
  cursor: pointer;
}

.month-select, .day-select {
  appearance: auto;
}

.date-separator {
  width: 1px;
  height: 16px;
  background: #e5e5ea;
  margin: 0 4px;
}

.day-input-wrapper {
  display: flex;
  align-items: center;
}

.day-select {
  border: none !important;
  background: transparent !important;
  padding: 4px 8px !important;
  font-size: 13px;
  color: #1d1d1f;
  outline: none;
  cursor: pointer;
}

.stat-value-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.stat-hint {
  font-size: 10px;
  color: #86868b;
  margin-top: 2px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.toggle-label input {
  accent-color: #007aff;
  width: 16px;
  height: 16px;
}

.toggle-text {
  font-size: 13px;
  color: #1d1d1f;
  font-weight: 500;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background: #007aff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0071eb;
}

.btn-success {
  background: #34c759;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #30b753;
}

.btn-secondary {
  background: #8e8e93;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #7a7a7f;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  margin: 16px 24px 0;
  padding: 12px 16px;
  background: #fff2f2;
  border: 1px solid #ffcfcf;
  border-radius: 12px;
  color: #ff3b30;
  font-size: 13px;
}

.report-content {
  padding: 40px;
}

.report-header {
  text-align: center;
  margin-bottom: 40px;
}

.report-header h2 {
  font-size: 28px;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0 0 6px;
  letter-spacing: -0.5px;
}

.subtitle {
  color: #86868b;
  font-size: 14px;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: #f5f5f7;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: scale(1.02);
}

.stat-header {
  font-size: 15px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #1d1d1f;
  letter-spacing: -1px;
}

.stat-card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #86868b;
  font-weight: 500;
}

.charts-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 40px;
}

.chart-card {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
}

.chart-card.full-width {
  grid-column: 1 / -1;
}

.chart-card h3 {
  font-size: 15px;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0 0 20px;
}

.chart-wrapper {
  height: 250px;
}

.chart-wrapper.wide {
  height: 200px;
}

.shower-stats-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 250px;
  gap: 24px;
  padding: 0 20px;
}

.shower-stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f5f5f7;
  padding-bottom: 12px;
}

.shower-stat-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.shower-stat-item .stat-label {
  font-size: 14px;
  color: #86868b;
}

.shower-stat-item .stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #1d1d1f;
  font-feature-settings: "tnum";
}

.details-section {
  margin-bottom: 24px;
}

.details-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0;
  letter-spacing: -0.5px;
}

.details-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #86868b;
}

.page-size-selector select {
  padding: 4px 8px;
  border: 1px solid #d2d2d7;
  border-radius: 6px;
  font-size: 13px;
  color: #1d1d1f;
  outline: none;
  cursor: pointer;
}

.table-wrapper {
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid #e5e5ea;
}

.details-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.details-table th {
  background: #f5f5f7;
  color: #86868b;
  padding: 12px 16px;
  text-align: left;
  font-weight: 500;
  border-bottom: 1px solid #e5e5ea;
}

.details-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e5ea;
  color: #1d1d1f;
}

.details-table tr:last-child td {
  border-bottom: none;
}

.details-table tr:hover {
  background: #fbfbfd;
}

.amount-cell {
  color: #1d1d1f;
  font-weight: 500;
  font-feature-settings: "tnum";
}

.report-footer {
  text-align: center;
  padding-top: 24px;
  border-top: 1px solid #e5e5ea;
  color: #86868b;
  font-size: 12px;
}

.report-promo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
  padding: 12px 20px;
  background: #f5f5f7;
  border-radius: 12px;
}

.promo-qr {
  width: 64px;
  height: 64px;
}

.promo-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.promo-title {
  font-size: 14px;
  font-weight: 600;
  color: #1d1d1f;
}

.promo-link {
  font-size: 12px;
  color: #0066cc;
  text-decoration: none;
}

.empty-state {
  padding: 100px 20px;
  text-align: center;
}

.empty-state p {
  color: #1d1d1f;
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 8px;
}

.empty-hint {
  color: #86868b !important;
  font-size: 14px !important;
  font-weight: 400 !important;
}

/* 分页控件样式 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
  padding: 16px;
}

.page-btn {
  padding: 6px 14px;
  background: #f5f5f7;
  color: #1d1d1f;
  border: 1px solid #e5e5ea;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #e5e5ea;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 13px;
  color: #86868b;
  font-feature-settings: "tnum";
}

@media (max-width: 768px) {
  .charts-section {
    grid-template-columns: 1fr;
  }
  
  .report-content {
    padding: 24px;
  }
}
</style>
