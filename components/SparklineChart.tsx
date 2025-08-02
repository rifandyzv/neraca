"use client";

import React, { useEffect, useState } from 'react';
import { useIndexedDB } from '../hooks/useIndexedDB';

interface Transaction {
  id?: number;
  amount: number;
  category: string;
  timestamp: number;
  notes?: string;
  app?: string;
}

export default function SparklineChart() {
  const { isDBReady, getTransactionsByDateRange } = useIndexedDB();
  const [activePeriod, setActivePeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  // Update chart based on active period
  const updateChart = async () => {
    if (!isDBReady || typeof window === 'undefined' || !(window as any).ApexCharts) return;
    
    const today = new Date();
    let data: number[] = [];
    let labels: string[] = [];
    
    if (activePeriod === 'daily') {
      // Hourly data for today
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      data = new Array(24).fill(0);
      labels = Array.from({length: 24}, (_, i) => `${i}:00`);
      
      // Get today's transactions and group by hour
      const startOfDayTime = startOfDay;
      const endOfDayTime = startOfDay + 24 * 60 * 60 * 1000;
      
      try {
        const transactions = await getTransactionsByDateRange(startOfDayTime, endOfDayTime);
        
        transactions.forEach(tx => {
          const hour = new Date(tx.timestamp).getHours();
          data[hour] += tx.amount;
        });
        
        renderChart(data, labels);
      } catch (error) {
        console.error('Error loading daily data:', error);
      }
    } else if (activePeriod === 'weekly') {
      // Daily data for this week
      const dayOfWeek = today.getDay();
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - adjustedDay);
      startOfWeek.setHours(0, 0, 0, 0);
      
      data = new Array(7).fill(0);
      labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      
      // Get week's transactions and group by day
      const startOfWeekTime = startOfWeek.getTime();
      const endOfWeekTime = startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000;
      
      try {
        const transactions = await getTransactionsByDateRange(startOfWeekTime, endOfWeekTime);
        
        transactions.forEach(tx => {
          const day = new Date(tx.timestamp).getDay();
          // Adjust day to match our labels (Mon=0, Sun=6)
          const adjustedDay = day === 0 ? 6 : day - 1;
          data[adjustedDay] += tx.amount;
        });
        
        renderChart(data, labels);
      } catch (error) {
        console.error('Error loading weekly data:', error);
      }
    } else if (activePeriod === 'monthly') {
      // Daily data for this month
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      data = new Array(daysInMonth).fill(0);
      labels = Array.from({length: daysInMonth}, (_, i) => (i + 1).toString());
      
      // Get month's transactions and group by day
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getTime() + 24 * 60 * 60 * 1000;
      
      try {
        const transactions = await getTransactionsByDateRange(startOfMonth, endOfMonth);
        
        transactions.forEach(tx => {
          const day = new Date(tx.timestamp).getDate();
          data[day - 1] += tx.amount;
        });
        
        renderChart(data, labels);
      } catch (error) {
        console.error('Error loading monthly data:', error);
      }
    }
  };

  // Render the chart
  const renderChart = (data: number[], labels: string[]) => {
    const chartElement = document.getElementById('sparklineChart');
    if (!chartElement) return;
    
    // Destroy existing chart if it exists
    if ((chartElement as any).chart) {
      (chartElement as any).chart.destroy();
    }
    
    // Create new chart
    const chart = new (window as any).ApexCharts(chartElement, {
      chart: {
        type: 'area',
        height: 80,
        sparkline: {
          enabled: true
        },
        animations: {
          enabled: true,
          easing: 'easeout'
        },
        background: 'transparent'
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      fill: {
        opacity: 0.3,
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'vertical',
          shadeIntensity: 0.5,
          gradientToColors: undefined,
          inverseColors: false,
          opacityFrom: 0.5,
          opacityTo: 0,
          stops: [0, 90, 100]
        }
      },
      series: [{
        name: 'Amount',
        data: data
      }],
      tooltip: {
        theme: 'dark',
        fixed: {
          enabled: true,
          position: 'topLeft',
          offsetX: 0,
          offsetY: 30,
        },
        x: {
          show: true,
          formatter: function(value: any, { seriesIndex, dataPointIndex }: any) {
            // Format the x-axis label in the tooltip based on the active period
            if (activePeriod === 'daily') {
              return `${labels[dataPointIndex]}:00`;
            } else if (activePeriod === 'weekly') {
              return labels[dataPointIndex];
            } else {
              return `${labels[dataPointIndex]} ${new Date().toLocaleDateString('en', { month: 'short' })}`;
            }
          }
        },
        y: {
          formatter: function(value: any) {
            return formatRupiah(value);
          }
        }
      },
      xaxis: {
        categories: labels
      }
    });
    
    chart.render();
    
    // Store chart reference
    (chartElement as any).chart = chart;
  };

  // Format amount in Indonesian Rupiah format
  const formatRupiah = (amount: number): string => {
    // Convert to string with 2 decimal places
    const formatted = parseFloat(amount.toString()).toFixed(2);
    
    // Split into integer and decimal parts
    const parts = formatted.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    // Add thousand separators to integer part
    const withThousands = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    // If decimal part is 00, omit it
    if (decimalPart === '00') {
      return `Rp${withThousands}`;
    }
    
    // Otherwise, include the decimal part with comma separator
    return `Rp${withThousands},${decimalPart}`;
  };

  // Update chart when active period changes or DB is ready
  useEffect(() => {
    updateChart();
  }, [activePeriod, isDBReady]);

  // Listen for period changes
  useEffect(() => {
    const handlePeriodChange = (event: CustomEvent) => {
      setActivePeriod(event.detail);
    };
    
    window.addEventListener('periodChange', handlePeriodChange as EventListener);
    
    return () => {
      window.removeEventListener('periodChange', handlePeriodChange as EventListener);
    };
  }, []);

  return <div id="sparklineChart"></div>;
}