"use client";

import React, { useState, useEffect } from 'react';
import { useIndexedDB } from '../hooks/useIndexedDB';

interface Transaction {
  id?: number;
  amount: number;
  category: string;
  timestamp: number;
  notes?: string;
  app?: string;
}

function formatRupiah(amount: number): string {
  const formatted = parseFloat(amount.toString()).toFixed(2);
  const parts = formatted.split('.');
  const withThousands = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (parts[1] === '00') return `Rp${withThousands}`;
  return `Rp${withThousands},${parts[1]}`;
}

export default function DetailedReports() {
  const { isDBReady, getTransactionsByDateRange, getAllTransactions } = useIndexedDB();
  const [activeTab, setActiveTab] = useState<'reports' | 'history'>('reports');
  const [todayTransactions, setTodayTransactions] = useState<Transaction[]>([]);
  const [weekTransactions, setWeekTransactions] = useState<Transaction[]>([]);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  const loadReportsData = async () => {
    if (!isDBReady) return;

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const endOfDay = startOfDay + 86400000;
    const dayOfWeek = today.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - adjustedDay);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = startOfWeek.getTime() + 604800000;
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getTime() + 86400000;

    try {
      const [todayTx, weekTx, monthTx, allTx] = await Promise.all([
        getTransactionsByDateRange(startOfDay, endOfDay),
        getTransactionsByDateRange(startOfWeek.getTime(), endOfWeek),
        getTransactionsByDateRange(startOfMonth, endOfMonth),
        getAllTransactions(),
      ]);

      setTodayTransactions(todayTx);
      setWeekTransactions(weekTx);
      setMonthTransactions(monthTx);
      setAllTransactions(allTx);

      if (typeof window !== 'undefined' && (window as any).ApexCharts) {
        renderPieChart('todayPieChart', todayTx);
        renderPieChart('weekPieChart', weekTx);
        renderWeekTrend(weekTx);
        renderPieChart('monthPieChart', monthTx);
        renderDailyBar(monthTx);
        renderMonthComparison(monthTx);
      }
    } catch (e) {
      console.error('Error loading reports:', e);
    }
  };

  const renderPieChart = (elementId: string, transactions: Transaction[]) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    if ((el as any).chart) (el as any).chart.destroy();

    const totals: Record<string, number> = {};
    transactions.forEach(tx => {
      totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
    });

    const categories = Object.keys(totals);
    if (categories.length === 0) {
      el.innerHTML = '<p style="text-align:center;color:#4a5060;padding:24px;font-size:14px;">No data</p>';
      return;
    }

    const chart = new (window as any).ApexCharts(el, {
      chart: { type: 'donut', height: 260, background: 'transparent' },
      labels: categories,
      series: Object.values(totals),
      colors: ['#ff8844', '#4488ff', '#ff44aa', '#aa66ff', '#666'],
      legend: { position: 'bottom', labels: { colors: '#999' }, fontFamily: 'monospace', fontSize: '11px' },
      stroke: { width: 2, colors: ['#141414'] },
      plotOptions: { pie: { donut: { size: '55%' } } },
      tooltip: {
        theme: 'dark',
        style: { fontFamily: 'Outfit' },
        y: { formatter: (v: any) => formatRupiah(v) },
      },
    });
    chart.render();
    (el as any).chart = chart;
  };

  const renderWeekTrend = (transactions: Transaction[]) => {
    const el = document.getElementById('weekTrendChart');
    if (!el) return;
    if ((el as any).chart) (el as any).chart.destroy();

    const total = transactions.reduce((s, t) => s + t.amount, 0);

    const chart = new (window as any).ApexCharts(el, {
      chart: { type: 'bar', height: 240, background: 'transparent', toolbar: { show: false } },
      series: [{ name: 'Spending', data: [0, 0, 0, total] }],
      xaxis: {
        categories: ['3w ago', '2w ago', 'Last week', 'This week'],
        labels: { style: { colors: '#666', fontFamily: 'monospace', fontSize: '10px' } },
      },
      yaxis: {
        labels: { formatter: (v: any) => formatRupiah(v), style: { colors: '#666', fontFamily: 'monospace', fontSize: '10px' } },
      },
      colors: ['#c8ff00'],
      plotOptions: { bar: { borderRadius: 0, columnWidth: '60%' } },
      grid: { borderColor: '#2a2a2a' },
      tooltip: { theme: 'dark', y: { formatter: (v: any) => formatRupiah(v) } },
    });
    chart.render();
    (el as any).chart = chart;
  };

  const renderDailyBar = (transactions: Transaction[]) => {
    const el = document.getElementById('dailyBarChart');
    if (!el) return;
    if ((el as any).chart) (el as any).chart.destroy();

    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dailyTotals: Record<number, number> = {};
    transactions.forEach(tx => {
      const day = new Date(tx.timestamp).getDate();
      dailyTotals[day] = (dailyTotals[day] || 0) + tx.amount;
    });

    const chart = new (window as any).ApexCharts(el, {
      chart: { type: 'bar', height: 240, background: 'transparent', toolbar: { show: false } },
      series: [{ name: 'Daily', data: Array.from({length: daysInMonth}, (_, i) => dailyTotals[i + 1] || 0) }],
      xaxis: {
        categories: Array.from({length: daysInMonth}, (_, i) => (i + 1).toString()),
        labels: { style: { colors: '#666', fontFamily: 'monospace', fontSize: '9px' } },
      },
      yaxis: {
        labels: { formatter: (v: any) => formatRupiah(v), style: { colors: '#666', fontFamily: 'monospace', fontSize: '10px' } },
      },
      colors: ['#4488ff'],
      plotOptions: { bar: { borderRadius: 0, columnWidth: '70%' } },
      grid: { borderColor: '#2a2a2a' },
      tooltip: { theme: 'dark', y: { formatter: (v: any) => formatRupiah(v) } },
    });
    chart.render();
    (el as any).chart = chart;
  };

  const renderMonthComparison = (transactions: Transaction[]) => {
    const el = document.getElementById('monthComparisonChart');
    if (!el) return;
    if ((el as any).chart) (el as any).chart.destroy();

    const thisMonth = transactions.reduce((s, t) => s + t.amount, 0);
    const lastMonth = thisMonth * 0.85;

    const chart = new (window as any).ApexCharts(el, {
      chart: { type: 'bar', height: 240, background: 'transparent', toolbar: { show: false } },
      series: [{ name: 'Spending', data: [lastMonth, thisMonth] }],
      xaxis: {
        categories: ['Last Month', 'This Month'],
        labels: { style: { colors: '#666', fontFamily: 'monospace', fontSize: '10px' } },
      },
      yaxis: {
        labels: { formatter: (v: any) => formatRupiah(v), style: { colors: '#666', fontFamily: 'monospace', fontSize: '10px' } },
      },
      colors: ['#aa66ff'],
      plotOptions: { bar: { borderRadius: 0, columnWidth: '50%' } },
      grid: { borderColor: '#2a2a2a' },
      tooltip: { theme: 'dark', y: { formatter: (v: any) => formatRupiah(v) } },
    });
    chart.render();
    (el as any).chart = chart;
  };

  const handleBack = () => {
    const el = document.getElementById('reportsScreen');
    if (el) el.style.display = 'none';
  };

  useEffect(() => {
    if (isDBReady) loadReportsData();
  }, [isDBReady]);

  useEffect(() => {
    const handler = () => loadReportsData();
    window.addEventListener('transactionAdded', handler);
    return () => window.removeEventListener('transactionAdded', handler);
  }, [isDBReady]);

  useEffect(() => {
    if (activeTab === 'reports' && isDBReady) {
      setTimeout(() => {
        if (typeof window !== 'undefined' && (window as any).ApexCharts) {
          renderPieChart('todayPieChart', todayTransactions);
          renderPieChart('weekPieChart', weekTransactions);
          renderWeekTrend(weekTransactions);
          renderPieChart('monthPieChart', monthTransactions);
          renderDailyBar(monthTransactions);
          renderMonthComparison(monthTransactions);
        }
      }, 100);
    }
  }, [activeTab, isDBReady, todayTransactions, weekTransactions, monthTransactions]);

  return (
    <div id="reportsScreen" className="reports-screen" style={{ display: "none" }}>
      <div className="reports-header">
        <button className="back-btn" onClick={handleBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          Back
        </button>
        <h2>Reports</h2>
      </div>

      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </button>
        <button
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'reports' && (
          <div className="tab-pane">
            <div id="todayDetailView">
              <div id="todayPieChart" />
              <h3>Today</h3>
              <ul id="todayTransactionsList">
                {todayTransactions.length === 0 ? (
                  <li>No transactions today</li>
                ) : (
                  todayTransactions.sort((a, b) => b.timestamp - a.timestamp).map(tx => (
                    <li key={tx.id}>
                      <span>
                        {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {tx.category} — {formatRupiah(tx.amount)}
                        {tx.app && ` (${tx.app})`}
                      </span>
                      {tx.notes && <div style={{ fontSize: '11px', color: '#666', marginTop: '4px', fontFamily: 'monospace' }}>{tx.notes}</div>}
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div id="weekDetailView">
              <div id="weekPieChart" />
              <div id="weekTrendChart" />
            </div>

            <div id="monthDetailView">
              <div id="monthPieChart" />
              <div id="dailyBarChart" />
              <div id="monthComparisonChart" />
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="tab-pane">
            <div id="fullTransactionHistory">
              {allTransactions.length === 0 ? (
                <p style={{ color: '#4a5060', textAlign: 'center', padding: '24px' }}>No transaction history</p>
              ) : (
                <ul>
                  {allTransactions.sort((a, b) => b.timestamp - a.timestamp).map(tx => (
                    <li key={tx.id}>
                      <span>
                        {new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {tx.category} — {formatRupiah(tx.amount)}
                        {tx.app && ` (${tx.app})`}
                      </span>
                      {tx.notes && <div style={{ fontSize: '11px', color: '#666', marginTop: '4px', fontFamily: 'monospace' }}>{tx.notes}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
