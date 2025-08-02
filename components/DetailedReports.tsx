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
    } catch (error) {
      console.error('Error loading reports data:', error);
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
  }, []);

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