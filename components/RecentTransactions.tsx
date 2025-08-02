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

export default function RecentTransactions() {
  const { isDBReady, getAllTransactions } = useIndexedDB();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

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

  // Load recent transactions
  const loadRecentTransactions = async () => {
    if (!isDBReady) return;
    
    try {
      const allTransactions = await getAllTransactions();
      // Sort by timestamp descending and take first 3
      const recent = allTransactions
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 3);
      setTransactions(recent);
    } catch (error) {
      console.error('Error loading recent transactions:', error);
    }
  };

  // Load transactions when DB is ready
  useEffect(() => {
    if (isDBReady) {
      loadRecentTransactions();
    }
  }, [isDBReady]);

  // Reload transactions when a new transaction is added
  useEffect(() => {
    const handleTransactionAdded = () => {
      loadRecentTransactions();
    };
    
    // Listen for transaction updates
    window.addEventListener('transactionAdded', handleTransactionAdded);
    
    return () => {
      window.removeEventListener('transactionAdded', handleTransactionAdded);
    };
  }, [isDBReady]);

  return (
    <div id="recentTransactions" className="recent-transactions">
      {transactions.length === 0 ? (
        <p className="no-transactions">No transactions yet</p>
      ) : (
        transactions.map((tx) => (
          <div key={tx.id} className="transaction-item">
            <div className="transaction-details">
              <div className="transaction-icon">
                <i data-lucide="circle"></i>
              </div>
              <div className="transaction-info">
                <div className="transaction-name">{tx.category}</div>
                <div className="transaction-time">
                  {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            <div className="transaction-amount">
              {formatRupiah(tx.amount)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}