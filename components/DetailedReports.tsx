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

const CATEGORY_COLORS: Record<string, string> = {
  'Food': '#ff8844',
  'Transport': '#4488ff',
  'Shopping': '#ff44aa',
  'Entertainment': '#aa66ff',
  'Other': '#666',
};

function formatRupiah(amount: number): string {
  const formatted = parseFloat(amount.toString()).toFixed(2);
  const parts = formatted.split('.');
  const withThousands = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (parts[1] === '00') return `Rp${withThousands}`;
  return `Rp${withThousands},${parts[1]}`;
}

function formatShortRupiah(amount: number): string {
  if (amount >= 1000000) return `Rp${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `Rp${(amount / 1000).toFixed(0)}K`;
  return `Rp${amount}`;
}

function getRelativeDate(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const txDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = today - txDay;

  if (diff === 0) return 'Today';
  if (diff === 86400000) return 'Yesterday';
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

interface SankeyItem {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

function SankeyDiagram({ items, total }: { items: SankeyItem[]; total: number }) {
  const SVG_W = 360;
  const SVG_H = Math.max(200, items.length * 56 + 20);
  const LEFT_X = 0;
  const LEFT_W = 6;
  const RIGHT_X = SVG_W;
  const RIGHT_W = 6;
  const CURVE_START = LEFT_X + LEFT_W;
  const CURVE_END = RIGHT_X - RIGHT_W;
  const MIN_BAND = 6;
  const GAP = 6;

  // Total bar on the left — full height minus gaps
  const totalBarH = SVG_H - 20;
  const totalBarY = 10;

  // Right side: compute band heights per category
  const rawBands = items.map(item => Math.max(MIN_BAND, (item.percentage / 100) * totalBarH));
  const totalRawH = rawBands.reduce((s, h) => s + h, 0) + GAP * (items.length - 1);
  const scale = totalBarH / totalRawH;
  const bands = rawBands.map(h => h * scale);

  // Y positions for right side bands
  const rightPositions: { y: number; h: number }[] = [];
  let curY = totalBarY;
  bands.forEach(h => {
    rightPositions.push({ y: curY, h });
    curY += h + GAP * scale;
  });

  // Y positions for left side — stacked proportionally
  const leftPositions: { y: number; h: number }[] = [];
  let leftCurY = totalBarY;
  bands.forEach(h => {
    leftPositions.push({ y: leftCurY, h });
    leftCurY += h;
  });

  // Build cubic bezier paths
  const cpOffset = (CURVE_END - CURVE_START) * 0.45;

  return (
    <div className="sankey-wrap">
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="sankey-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {items.map((item, i) => (
            <linearGradient
              key={item.category}
              id={`sankey-grad-${i}`}
              x1="0%" y1="0%" x2="100%" y2="0%"
            >
              <stop offset="0%" stopColor={item.color} stopOpacity="0.5" />
              <stop offset="100%" stopColor={item.color} stopOpacity="0.25" />
            </linearGradient>
          ))}
        </defs>

        {/* Left bar (total) */}
        <rect
          x={LEFT_X}
          y={totalBarY}
          width={LEFT_W}
          height={totalBarH}
          fill="#c8ff00"
        />

        {/* Flow paths */}
        {items.map((item, i) => {
          const lp = leftPositions[i];
          const rp = rightPositions[i];

          const topPath = `
            M ${CURVE_START} ${lp.y}
            C ${CURVE_START + cpOffset} ${lp.y},
              ${CURVE_END - cpOffset} ${rp.y},
              ${CURVE_END} ${rp.y}
          `;
          const bottomPath = `
            L ${CURVE_END} ${rp.y + rp.h}
            C ${CURVE_END - cpOffset} ${rp.y + rp.h},
              ${CURVE_START + cpOffset} ${lp.y + lp.h},
              ${CURVE_START} ${lp.y + lp.h}
            Z
          `;

          return (
            <path
              key={item.category}
              d={topPath + bottomPath}
              fill={`url(#sankey-grad-${i})`}
              className="sankey-flow"
            />
          );
        })}

        {/* Right bars (categories) */}
        {items.map((item, i) => {
          const rp = rightPositions[i];
          return (
            <rect
              key={item.category}
              x={CURVE_END}
              y={rp.y}
              width={RIGHT_W}
              height={rp.h}
              fill={item.color}
            />
          );
        })}

        {/* Left label */}
        <text
          x={LEFT_X + LEFT_W + 10}
          y={totalBarY + totalBarH / 2 - 8}
          className="sankey-label-total"
        >
          Total
        </text>
        <text
          x={LEFT_X + LEFT_W + 10}
          y={totalBarY + totalBarH / 2 + 10}
          className="sankey-label-amount"
        >
          {formatRupiah(total)}
        </text>

        {/* Right labels */}
        {items.map((item, i) => {
          const rp = rightPositions[i];
          const labelY = rp.y + rp.h / 2;
          return (
            <g key={item.category}>
              <text
                x={CURVE_END - 12}
                y={labelY - 1}
                textAnchor="end"
                className="sankey-label-cat"
                fill={item.color}
              >
                {item.category}
              </text>
              <text
                x={CURVE_END - 12}
                y={labelY + 12}
                textAnchor="end"
                className="sankey-label-val"
              >
                {formatRupiah(item.amount)} · {item.percentage.toFixed(0)}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
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
    } catch (e) {
      console.error('Error loading reports:', e);
    }
  };

  // Group transactions by category with totals and percentages
  const getCategoryBreakdown = (transactions: Transaction[]) => {
    const totals: Record<string, number> = {};
    transactions.forEach(tx => {
      totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
    });
    const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);
    return Object.entries(totals)
      .map(([cat, amount]) => ({
        category: cat,
        amount,
        percentage: grandTotal > 0 ? (amount / grandTotal) * 100 : 0,
        color: CATEGORY_COLORS[cat] || '#666',
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  // Render charts when reports tab is active and data is available
  useEffect(() => {
    if (activeTab !== 'reports' || !isDBReady) return;

    const timer = setTimeout(() => {
      if (typeof window === 'undefined' || !(window as any).ApexCharts) return;

      // Weekly daily breakdown (area chart)
      renderWeeklyArea(weekTransactions);
      // Monthly daily breakdown (bar chart)
      renderMonthlyBar(monthTransactions);
    }, 150);

    return () => clearTimeout(timer);
  }, [activeTab, isDBReady, weekTransactions, monthTransactions]);

  const renderWeeklyArea = (transactions: Transaction[]) => {
    const el = document.getElementById('weekAreaChart');
    if (!el) return;
    if ((el as any).chart) (el as any).chart.destroy();

    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = new Array(7).fill(0);
    transactions.forEach(tx => {
      const day = new Date(tx.timestamp).getDay();
      data[day === 0 ? 6 : day - 1] += tx.amount;
    });

    const chart = new (window as any).ApexCharts(el, {
      chart: {
        type: 'area',
        height: 180,
        background: 'transparent',
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      series: [{ name: 'Spent', data }],
      xaxis: {
        categories: labels,
        axisBorder: { color: '#2a2a2a' },
        axisTicks: { color: '#2a2a2a' },
        labels: { style: { colors: '#999', fontFamily: 'monospace', fontSize: '10px' } },
      },
      yaxis: {
        labels: {
          formatter: (v: any) => formatShortRupiah(v),
          style: { colors: '#666', fontFamily: 'monospace', fontSize: '10px' },
        },
      },
      stroke: { curve: 'stepline', width: 2, colors: ['#c8ff00'] },
      fill: { opacity: 0.06, type: 'solid', colors: ['#c8ff00'] },
      colors: ['#c8ff00'],
      grid: { borderColor: '#1c1c1c', strokeDashArray: 3 },
      dataLabels: { enabled: false },
      tooltip: {
        theme: 'dark',
        style: { fontFamily: 'monospace', fontSize: '11px' },
        y: { formatter: (v: any) => formatRupiah(v) },
      },
    });
    chart.render();
    (el as any).chart = chart;
  };

  const renderMonthlyBar = (transactions: Transaction[]) => {
    const el = document.getElementById('monthBarChart');
    if (!el) return;
    if ((el as any).chart) (el as any).chart.destroy();

    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dailyTotals: Record<number, number> = {};
    transactions.forEach(tx => {
      const day = new Date(tx.timestamp).getDate();
      dailyTotals[day] = (dailyTotals[day] || 0) + tx.amount;
    });

    const data = Array.from({ length: daysInMonth }, (_, i) => dailyTotals[i + 1] || 0);
    const todayDate = today.getDate();
    // Color today's bar differently
    const colors = data.map((_, i) => i + 1 === todayDate ? '#c8ff00' : '#4488ff');

    const chart = new (window as any).ApexCharts(el, {
      chart: {
        type: 'bar',
        height: 200,
        background: 'transparent',
        toolbar: { show: false },
      },
      series: [{ name: 'Daily', data }],
      xaxis: {
        categories: Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString()),
        axisBorder: { color: '#2a2a2a' },
        axisTicks: { show: false },
        labels: {
          style: { colors: '#666', fontFamily: 'monospace', fontSize: '8px' },
          rotate: 0,
          hideOverlappingLabels: true,
        },
      },
      yaxis: {
        labels: {
          formatter: (v: any) => formatShortRupiah(v),
          style: { colors: '#666', fontFamily: 'monospace', fontSize: '10px' },
        },
      },
      colors: ['#4488ff'],
      plotOptions: {
        bar: {
          borderRadius: 0,
          columnWidth: '80%',
          distributed: true,
          colors: { ranges: [{ from: 0, to: Infinity, color: '#4488ff' }] },
        },
      },
      states: {
        hover: { filter: { type: 'lighten', value: 0.15 } },
      },
      grid: { borderColor: '#1c1c1c', strokeDashArray: 3 },
      dataLabels: { enabled: false },
      legend: { show: false },
      tooltip: {
        theme: 'dark',
        style: { fontFamily: 'monospace', fontSize: '11px' },
        y: { formatter: (v: any) => formatRupiah(v) },
        x: {
          formatter: (v: any) => {
            const monthName = today.toLocaleDateString('en', { month: 'short' });
            return `${v} ${monthName}`;
          },
        },
      },
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

  // Compute stats
  const todayTotal = todayTransactions.reduce((s, t) => s + t.amount, 0);
  const weekTotal = weekTransactions.reduce((s, t) => s + t.amount, 0);
  const monthTotal = monthTransactions.reduce((s, t) => s + t.amount, 0);
  const todayBreakdown = getCategoryBreakdown(todayTransactions);
  const weekBreakdown = getCategoryBreakdown(weekTransactions);
  const monthBreakdown = getCategoryBreakdown(monthTransactions);

  // Group history by date
  const groupedHistory: Record<string, Transaction[]> = {};
  allTransactions.sort((a, b) => b.timestamp - a.timestamp).forEach(tx => {
    const dateKey = getRelativeDate(tx.timestamp);
    if (!groupedHistory[dateKey]) groupedHistory[dateKey] = [];
    groupedHistory[dateKey].push(tx);
  });

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
            {/* ── Overview Stats ────────── */}
            <div className="rpt-stats-grid">
              <div className="rpt-stat-card">
                <span className="rpt-stat-label">Today</span>
                <span className="rpt-stat-value">{formatRupiah(todayTotal)}</span>
                <span className="rpt-stat-count">{todayTransactions.length} txn{todayTransactions.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="rpt-stat-card">
                <span className="rpt-stat-label">This Week</span>
                <span className="rpt-stat-value">{formatRupiah(weekTotal)}</span>
                <span className="rpt-stat-count">{weekTransactions.length} txn{weekTransactions.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="rpt-stat-card rpt-stat-card--full">
                <span className="rpt-stat-label">This Month</span>
                <span className="rpt-stat-value rpt-stat-value--large">{formatRupiah(monthTotal)}</span>
                <span className="rpt-stat-count">{monthTransactions.length} txn{monthTransactions.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* ── Monthly Category Breakdown — Sankey ── */}
            <div className="rpt-section">
              <h3 className="rpt-section-title">Where your money goes</h3>
              {monthBreakdown.length === 0 ? (
                <div className="rpt-empty">No spending data this month</div>
              ) : (
                <SankeyDiagram
                  items={monthBreakdown}
                  total={monthTotal}
                />
              )}
            </div>

            {/* ── Weekly Spending Chart ──── */}
            <div className="rpt-section">
              <h3 className="rpt-section-title">This week — daily</h3>
              {weekTransactions.length === 0 ? (
                <div className="rpt-empty">No spending this week</div>
              ) : (
                <div id="weekAreaChart" className="rpt-chart" />
              )}
            </div>

            {/* ── Monthly Daily Bar Chart ── */}
            <div className="rpt-section">
              <h3 className="rpt-section-title">
                {new Date().toLocaleDateString('en', { month: 'long' })} — daily breakdown
              </h3>
              {monthTransactions.length === 0 ? (
                <div className="rpt-empty">No spending this month</div>
              ) : (
                <div id="monthBarChart" className="rpt-chart" />
              )}
            </div>

            {/* ── Today's Transactions ──── */}
            <div className="rpt-section">
              <h3 className="rpt-section-title">Today&apos;s transactions</h3>
              {todayTransactions.length === 0 ? (
                <div className="rpt-empty">Nothing spent today</div>
              ) : (
                <div className="rpt-tx-list">
                  {todayTransactions.sort((a, b) => b.timestamp - a.timestamp).map(tx => (
                    <div key={tx.id} className="rpt-tx-item">
                      <span className="rpt-tx-dot" style={{ background: CATEGORY_COLORS[tx.category] || '#666' }} />
                      <div className="rpt-tx-info">
                        <span className="rpt-tx-cat">{tx.category}</span>
                        <span className="rpt-tx-time">
                          {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {tx.app && ` · ${tx.app}`}
                        </span>
                        {tx.notes && <span className="rpt-tx-notes">{tx.notes}</span>}
                      </div>
                      <span className="rpt-tx-amount">-{formatRupiah(tx.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="tab-pane">
            {allTransactions.length === 0 ? (
              <div className="rpt-empty" style={{ padding: '48px 16px' }}>No transaction history yet</div>
            ) : (
              <div className="rpt-history">
                {Object.entries(groupedHistory).map(([dateLabel, txs]) => (
                  <div key={dateLabel} className="rpt-history-group">
                    <div className="rpt-history-date">
                      <span>{dateLabel}</span>
                      <span className="rpt-history-date-total">
                        -{formatRupiah(txs.reduce((s, t) => s + t.amount, 0))}
                      </span>
                    </div>
                    {txs.map(tx => (
                      <div key={tx.id} className="rpt-tx-item">
                        <span className="rpt-tx-dot" style={{ background: CATEGORY_COLORS[tx.category] || '#666' }} />
                        <div className="rpt-tx-info">
                          <span className="rpt-tx-cat">{tx.category}</span>
                          <span className="rpt-tx-time">
                            {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {tx.app && ` · ${tx.app}`}
                          </span>
                          {tx.notes && <span className="rpt-tx-notes">{tx.notes}</span>}
                        </div>
                        <span className="rpt-tx-amount">-{formatRupiah(tx.amount)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
