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

const CATEGORY_CONFIG: Record<string, { color: string; letter: string }> = {
  'Food': { color: '#fb923c', letter: 'F' },
  'Transport': { color: '#38bdf8', letter: 'T' },
  'Shopping': { color: '#f472b6', letter: 'S' },
  'Entertainment': { color: '#a78bfa', letter: 'E' },
  'Other': { color: '#64748b', letter: 'O' },
};

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatRupiah(amount: number): string {
  const formatted = parseFloat(amount.toString()).toFixed(2);
  const parts = formatted.split('.');
  const withThousands = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (parts[1] === '00') return `Rp${withThousands}`;
  return `Rp${withThousands},${parts[1]}`;
}

export default function RecentTransactions() {
  const { isDBReady, getAllTransactions } = useIndexedDB();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const loadRecent = async () => {
    if (!isDBReady) return;
    try {
      const all = await getAllTransactions();
      setTransactions(all.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5));
    } catch (e) {
      console.error('Error loading transactions:', e);
    }
  };

  useEffect(() => {
    if (isDBReady) loadRecent();
  }, [isDBReady]);

  useEffect(() => {
    const handler = () => loadRecent();
    window.addEventListener('transactionAdded', handler);
    return () => window.removeEventListener('transactionAdded', handler);
  }, [isDBReady]);

  if (transactions.length === 0) {
    return (
      <div className="tx-list">
        <div className="tx-empty">
          <div className="tx-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
          </div>
          <p className="tx-empty-text">No transactions yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tx-list">
      {transactions.map((tx) => {
        const config = CATEGORY_CONFIG[tx.category] || CATEGORY_CONFIG['Other'];
        return (
          <div key={tx.id} className="tx-item">
            <div
              className="tx-cat-dot"
              style={{
                background: `${config.color}18`,
                color: config.color,
              }}
            >
              {config.letter}
            </div>
            <div className="tx-info">
              <div className="tx-name">{tx.category}</div>
              <div className="tx-time">{getRelativeTime(tx.timestamp)}</div>
            </div>
            <div className="tx-amount">-{formatRupiah(tx.amount)}</div>
          </div>
        );
      })}
    </div>
  );
}
