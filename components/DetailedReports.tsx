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

export default function DetailedReports() {
  const { isDBReady, getTransactionsByDateRange, getAllTransactions } = useIndexedDB();
  const [activeTab, setActiveTab] = useState<'reports' | 'history'>('reports');
  const [todayTransactions, setTodayTransactions] = useState<Transaction[]>([]);
  const [weekTransactions, setWeekTransactions] = useState<Transaction[]>([]);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  // Format amount in Indonesian Rupiah format
  // Load data for all reports
  const loadReportsData = async () => {
    if (!isDBReady) return;
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
    
    // Calculate start of week (Monday) correctly
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // Adjust to make Monday = 0, Sunday = 6
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - adjustedDay);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000;
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getTime() + 24 * 60 * 60 * 1000;
    
    try {
      // Get transactions for each period
      const todayTx = await getTransactionsByDateRange(startOfDay, endOfDay);
      const weekTx = await getTransactionsByDateRange(startOfWeek.getTime(), endOfWeek);
      const monthTx = await getTransactionsByDateRange(startOfMonth, endOfMonth);
      const allTx = await getAllTransactions();
      
      setTodayTransactions(todayTx);
      setWeekTransactions(weekTx);
      setMonthTransactions(monthTx);
      setAllTransactions(allTx);
      
      // Render charts after data is loaded
      if (typeof window !== 'undefined' && (window as any).ApexCharts) {
        renderTodayChart(todayTx);
        renderWeekCharts(weekTx);
        renderMonthCharts(monthTx);
      }
    } catch (error) {
      console.error('Error loading reports data:', error);
    }
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

  // Render today's pie chart
  const renderTodayChart = (transactions: Transaction[]) => {
    const chartElement = document.getElementById('todayPieChart');
    if (!chartElement) return;
    
    // Destroy existing chart if it exists
    if ((chartElement as any).chart) {
      (chartElement as any).chart.destroy();
    }
    
    // Group transactions by category
    const categoryTotals: { [key: string]: number } = {};
    transactions.forEach(tx => {
      if (categoryTotals[tx.category]) {
        categoryTotals[tx.category] += tx.amount;
      } else {
        categoryTotals[tx.category] = tx.amount;
      }
    });
    
    // Prepare data for chart
    const categories = Object.keys(categoryTotals);
    const amounts = Object.values(categoryTotals);
    
    if (categories.length === 0) {
      chartElement.innerHTML = '<p style="text-align:center;color:#A9B1BD;">No data to display</p>';
      return;
    }
    
    // Create chart
    const chart = new (window as any).ApexCharts(chartElement, {
      chart: {
        type: 'pie',
        height: 300,
        background: 'transparent'
      },
      labels: categories,
      series: amounts,
      colors: ['#00F260', '#0575E6', '#AC39E6', '#E63946', '#F4A261'],
      legend: {
        position: 'bottom',
        labels: {
          colors: '#A9B1BD'
        }
      },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: function(value: any) {
            return formatRupiah(value);
          }
        }
      }
    });
    
    chart.render();
    
    // Store chart reference
    (chartElement as any).chart = chart;
  };

  // Render week's charts
  const renderWeekCharts = (transactions: Transaction[]) => {
    // Pie chart by category
    const pieChartElement = document.getElementById('weekPieChart');
    if (pieChartElement) {
      // Destroy existing chart if it exists
      if ((pieChartElement as any).chart) {
        (pieChartElement as any).chart.destroy();
      }
      
      // Group transactions by category
      const categoryTotals: { [key: string]: number } = {};
      transactions.forEach(tx => {
        if (categoryTotals[tx.category]) {
          categoryTotals[tx.category] += tx.amount;
        } else {
          categoryTotals[tx.category] = tx.amount;
        }
      });
      
      // Prepare data for chart
      const categories = Object.keys(categoryTotals);
      const amounts = Object.values(categoryTotals);
      
      if (categories.length > 0) {
        // Create chart
        const chart = new (window as any).ApexCharts(pieChartElement, {
          chart: {
            type: 'pie',
            height: 300,
            background: 'transparent'
          },
          labels: categories,
          series: amounts,
          colors: ['#00F260', '#0575E6', '#AC39E6', '#E63946', '#F4A261'],
          legend: {
            position: 'bottom',
            labels: {
              colors: '#A9B1BD'
            }
          },
          tooltip: {
            theme: 'dark',
            y: {
              formatter: function(value: any) {
                return formatRupiah(value);
              }
            }
          }
        });
        
        chart.render();
        
        // Store chart reference
        (pieChartElement as any).chart = chart;
      } else {
        pieChartElement.innerHTML = '<p style="text-align:center;color:#A9B1BD;">No data to display</p>';
      }
    }
    
    // 4-week spending trend chart
    const trendChartElement = document.getElementById('weekTrendChart');
    if (trendChartElement) {
      // Destroy existing chart if it exists
      if ((trendChartElement as any).chart) {
        (trendChartElement as any).chart.destroy();
      }
      
      // Calculate data for the last 4 weeks
      const weeks = ['3 Weeks Ago', '2 Weeks Ago', 'Last Week', 'This Week'];
      const weekTotals = [0, 0, 0, 0];
      
      const today = new Date();
      const dayOfWeek = today.getDay();
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      // This week
      weekTotals[3] = transactions.reduce((sum, tx) => sum + tx.amount, 0);
      
      // Previous weeks would require more complex data, but for now we'll just show this week's data
      // In a full implementation, you'd fetch data for previous weeks
      
      // Create chart
      const chart = new (window as any).ApexCharts(trendChartElement, {
        chart: {
          type: 'bar',
          height: 300,
          background: 'transparent'
        },
        series: [{
          name: 'Total Spending',
          data: weekTotals
        }],
        xaxis: {
          categories: weeks,
          labels: {
            style: {
              colors: '#A9B1BD'
            }
          }
        },
        yaxis: {
          labels: {
            formatter: function(value: any) {
              return formatRupiah(value);
            },
            style: {
              colors: '#A9B1BD'
            }
          }
        },
        colors: ['#0575E6'],
        tooltip: {
          theme: 'dark',
          y: {
            formatter: function(value: any) {
              return formatRupiah(value);
            }
          }
        }
      });
      
      chart.render();
      
      // Store chart reference
      (trendChartElement as any).chart = chart;
    }
  };

  // Render month's charts
  const renderMonthCharts = (transactions: Transaction[]) => {
    // Pie chart by category
    const pieChartElement = document.getElementById('monthPieChart');
    if (pieChartElement) {
      // Destroy existing chart if it exists
      if ((pieChartElement as any).chart) {
        (pieChartElement as any).chart.destroy();
      }
      
      // Group transactions by category
      const categoryTotals: { [key: string]: number } = {};
      transactions.forEach(tx => {
        if (categoryTotals[tx.category]) {
          categoryTotals[tx.category] += tx.amount;
        } else {
          categoryTotals[tx.category] = tx.amount;
        }
      });
      
      // Prepare data for chart
      const categories = Object.keys(categoryTotals);
      const amounts = Object.values(categoryTotals);
      
      if (categories.length > 0) {
        // Create chart
        const chart = new (window as any).ApexCharts(pieChartElement, {
          chart: {
            type: 'pie',
            height: 300,
            background: 'transparent'
          },
          labels: categories,
          series: amounts,
          colors: ['#00F260', '#0575E6', '#AC39E6', '#E63946', '#F4A261'],
          legend: {
            position: 'bottom',
            labels: {
              colors: '#A9B1BD'
            }
          },
          tooltip: {
            theme: 'dark',
            y: {
              formatter: function(value: any) {
                return formatRupiah(value);
              }
            }
          }
        });
        
        chart.render();
        
        // Store chart reference
        (pieChartElement as any).chart = chart;
      } else {
        pieChartElement.innerHTML = '<p style="text-align:center;color:#A9B1BD;">No data to display</p>';
      }
    }
    
    // Daily spending bar chart
    const dailyChartElement = document.getElementById('dailyBarChart');
    if (dailyChartElement) {
      // Destroy existing chart if it exists
      if ((dailyChartElement as any).chart) {
        (dailyChartElement as any).chart.destroy();
      }
      
      // Group transactions by day
      const dailyTotals: { [key: number]: number } = {};
      transactions.forEach(tx => {
        const day = new Date(tx.timestamp).getDate();
        if (dailyTotals[day]) {
          dailyTotals[day] += tx.amount;
        } else {
          dailyTotals[day] = tx.amount;
        }
      });
      
      // Prepare data for chart
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const categories = Array.from({length: daysInMonth}, (_, i) => (i + 1).toString());
      const amounts = Array.from({length: daysInMonth}, (_, i) => dailyTotals[i + 1] || 0);
      
      // Create chart
      const chart = new (window as any).ApexCharts(dailyChartElement, {
        chart: {
          type: 'bar',
          height: 300,
          background: 'transparent'
        },
        series: [{
          name: 'Daily Spending',
          data: amounts
        }],
        xaxis: {
          categories: categories,
          labels: {
            style: {
              colors: '#A9B1BD'
            }
          }
        },
        yaxis: {
          labels: {
            formatter: function(value: any) {
              return formatRupiah(value);
            },
            style: {
              colors: '#A9B1BD'
            }
          }
        },
        colors: ['#0575E6'],
        tooltip: {
          theme: 'dark',
          y: {
            formatter: function(value: any) {
              return formatRupiah(value);
            }
          }
        }
      });
      
      chart.render();
      
      // Store chart reference
      (dailyChartElement as any).chart = chart;
    }
    
    // Month comparison chart
    const comparisonChartElement = document.getElementById('monthComparisonChart');
    if (comparisonChartElement) {
      // Destroy existing chart if it exists
      if ((comparisonChartElement as any).chart) {
        (comparisonChartElement as any).chart.destroy();
      }
      
      // Calculate this month and last month totals
      const thisMonthTotal = transactions.reduce((sum, tx) => sum + tx.amount, 0);
      // For demo purposes, we'll use a fixed value for last month
      // In a full implementation, you'd calculate the actual last month's total
      const lastMonthTotal = thisMonthTotal * 0.85; // Simulate last month being 15% less
      
      // Calculate percentage change
      const percentageChange = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
      const isIncrease = percentageChange > 0;
      const color = isIncrease ? '#E63946' : '#00F260';
      
      // Create chart
      const chart = new (window as any).ApexCharts(comparisonChartElement, {
        chart: {
          type: 'bar',
          height: 300,
          background: 'transparent'
        },
        series: [{
          name: 'Monthly Spending',
          data: [lastMonthTotal, thisMonthTotal]
        }],
        xaxis: {
          categories: ['Last Month', 'This Month'],
          labels: {
            style: {
              colors: '#A9B1BD'
            }
          }
        },
        yaxis: {
          labels: {
            formatter: function(value: any) {
              return formatRupiah(value);
            },
            style: {
              colors: '#A9B1BD'
            }
          }
        },
        colors: ['#0575E6'],
        tooltip: {
          theme: 'dark',
          y: {
            formatter: function(value: any) {
              return formatRupiah(value);
            }
          }
        },
        annotations: {
          texts: [{
            x: '50%',
            y: '10%',
            text: `${isIncrease ? '+' : ''}${percentageChange.toFixed(1)}%`,
            fontSize: '16px',
            fontWeight: 600,
            foreColor: color,
            borderColor: color,
            borderWidth: 1,
            borderRadius: 4,
            paddingLeft: 8,
            paddingRight: 8,
            background: 'rgba(26, 31, 37, 0.8)'
          }]
        }
      });
      
      chart.render();
      
      // Store chart reference
      (comparisonChartElement as any).chart = chart;
    }
  };

  // Load data when DB is ready
  useEffect(() => {
    if (isDBReady) {
      loadReportsData();
    }
  }, [isDBReady]);

  // Reload data when a new transaction is added
  useEffect(() => {
    const handleTransactionAdded = () => {
      loadReportsData();
    };
    
    // Listen for transaction updates
    window.addEventListener('transactionAdded', handleTransactionAdded);
    
    return () => {
      window.removeEventListener('transactionAdded', handleTransactionAdded);
    };
  }, [isDBReady]);

  // Re-render charts when reports tab becomes active
  useEffect(() => {
    if (activeTab === 'reports' && isDBReady) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (typeof window !== 'undefined' && (window as any).ApexCharts) {
          renderTodayChart(todayTransactions);
          renderWeekCharts(weekTransactions);
          renderMonthCharts(monthTransactions);
        }
      }, 100);
    }
  }, [activeTab, isDBReady, todayTransactions, weekTransactions, monthTransactions]);

  return (
    <div id="reportsScreen" className="reports-screen" style={{ display: "none" }}>
      <div className="reports-header">
        <button className="back-btn" id="backFromReports">
          <i data-lucide="arrow-left"></i> Back
        </button>
        <h2>Reports & History</h2>
      </div>
      
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`} 
          data-tab="reports"
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </button>
        <button 
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`} 
          data-tab="history"
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>
      
      {/* Tab Content */}
      <div className="tab-content">
        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div id="reportsTab" className="tab-pane active">
            {/* Today's Detail View */}
            <div id="todayDetailView">
              <div id="todayPieChart"></div>
              <h3>Today's Transactions</h3>
              <ul id="todayTransactionsList">
                {todayTransactions.length === 0 ? (
                  <li>No transactions today</li>
                ) : (
                  todayTransactions
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map(tx => (
                      <li key={tx.id}>
                        <span>
                          {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {tx.category} - {formatRupiah(tx.amount)}
                          {tx.app && ` (via ${tx.app})`}
                        </span>
                        {tx.notes && (
                          <div style={{ fontSize: '0.9em', color: '#9CA3AF' }}>
                            {tx.notes}
                          </div>
                        )}
                      </li>
                    ))
                )}
              </ul>
            </div>
            
            {/* Week's Detail View */}
            <div id="weekDetailView">
              <div id="weekPieChart"></div>
              <div id="weekTrendChart"></div>
            </div>
            
            {/* Month's Detail View */}
            <div id="monthDetailView">
              <div id="monthPieChart"></div>
              <div id="dailyBarChart"></div>
              <div id="monthComparisonChart"></div>
            </div>
          </div>
        )}
        
        {/* History Tab */}
        {activeTab === 'history' && (
          <div id="historyTab" className="tab-pane active">
            <div id="fullTransactionHistory">
              {allTransactions.length === 0 ? (
                <p>No transaction history</p>
              ) : (
                <ul>
                  {allTransactions
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map(tx => (
                      <li key={tx.id}>
                        <span>
                          {new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {tx.category} - {formatRupiah(tx.amount)}
                          {tx.app && ` (via ${tx.app})`}
                        </span>
                        {tx.notes && (
                          <div style={{ fontSize: '0.9em', color: '#9CA3AF' }}>
                            {tx.notes}
                          </div>
                        )}
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