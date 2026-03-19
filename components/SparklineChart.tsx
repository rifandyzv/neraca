"use client";

import React, { useEffect, useState } from 'react';
import { useIndexedDB } from '../hooks/useIndexedDB';

export default function SparklineChart() {
  const { isDBReady, getTransactionsByDateRange } = useIndexedDB();
  const [activePeriod, setActivePeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const formatRupiah = (amount: number): string => {
    const formatted = parseFloat(amount.toString()).toFixed(2);
    const parts = formatted.split('.');
    const withThousands = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (parts[1] === '00') return `Rp${withThousands}`;
    return `Rp${withThousands},${parts[1]}`;
  };

  const updateChart = async () => {
    if (!isDBReady || typeof window === 'undefined' || !(window as any).ApexCharts) return;

    const today = new Date();
    let data: number[] = [];
    let labels: string[] = [];

    if (activePeriod === 'daily') {
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      data = new Array(24).fill(0);
      labels = Array.from({length: 24}, (_, i) => `${i}:00`);

      try {
        const transactions = await getTransactionsByDateRange(startOfDay, startOfDay + 86400000);
        transactions.forEach(tx => {
          data[new Date(tx.timestamp).getHours()] += tx.amount;
        });
        renderChart(data, labels);
      } catch (e) { console.error(e); }

    } else if (activePeriod === 'weekly') {
      const dayOfWeek = today.getDay();
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - adjustedDay);
      startOfWeek.setHours(0, 0, 0, 0);
      data = new Array(7).fill(0);
      labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      try {
        const transactions = await getTransactionsByDateRange(startOfWeek.getTime(), startOfWeek.getTime() + 604800000);
        transactions.forEach(tx => {
          const day = new Date(tx.timestamp).getDay();
          data[day === 0 ? 6 : day - 1] += tx.amount;
        });
        renderChart(data, labels);
      } catch (e) { console.error(e); }

    } else {
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      data = new Array(daysInMonth).fill(0);
      labels = Array.from({length: daysInMonth}, (_, i) => (i + 1).toString());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getTime() + 86400000;

      try {
        const transactions = await getTransactionsByDateRange(startOfMonth, endOfMonth);
        transactions.forEach(tx => {
          data[new Date(tx.timestamp).getDate() - 1] += tx.amount;
        });
        renderChart(data, labels);
      } catch (e) { console.error(e); }
    }
  };

  const renderChart = (data: number[], labels: string[]) => {
    const el = document.getElementById('sparklineChart');
    if (!el) return;

    if ((el as any).chart) (el as any).chart.destroy();

    const chart = new (window as any).ApexCharts(el, {
      chart: {
        type: 'area',
        height: 90,
        sparkline: { enabled: true },
        animations: { enabled: true, easing: 'easeout', speed: 400 },
        background: 'transparent',
      },
      stroke: {
        curve: 'stepline',
        width: 2,
        colors: ['#c8ff00'],
      },
      fill: {
        opacity: 0.08,
        type: 'solid',
        colors: ['#c8ff00'],
      },
      colors: ['#c8ff00'],
      series: [{ name: 'Spent', data }],
      tooltip: {
        theme: 'dark',
        fixed: { enabled: true, position: 'topLeft', offsetX: 0, offsetY: 30 },
        style: { fontFamily: 'monospace' },
        x: {
          show: true,
          formatter: (_: any, { dataPointIndex }: any) => {
            if (activePeriod === 'daily') return `${labels[dataPointIndex]}`;
            if (activePeriod === 'weekly') return labels[dataPointIndex];
            return `${labels[dataPointIndex]} ${new Date().toLocaleDateString('en', { month: 'short' })}`;
          },
        },
        y: { formatter: (val: any) => formatRupiah(val) },
      },
      xaxis: { categories: labels },
    });

    chart.render();
    (el as any).chart = chart;
  };

  useEffect(() => { updateChart(); }, [activePeriod, isDBReady]);

  useEffect(() => {
    const onPeriod = (e: CustomEvent) => setActivePeriod(e.detail);
    const onTx = () => updateChart();
    window.addEventListener('periodChange', onPeriod as EventListener);
    window.addEventListener('transactionAdded', onTx);
    return () => {
      window.removeEventListener('periodChange', onPeriod as EventListener);
      window.removeEventListener('transactionAdded', onTx);
    };
  }, [isDBReady]);

  return <div id="sparklineChart" />;
}
