"use client";

import React, { useState, useEffect, useRef } from 'react';
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

export default function ExpenseModal() {
  const { isDBReady, addTransaction } = useIndexedDB();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [showPayWith, setShowPayWith] = useState(false);
  const toastRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setDate(new Date().toISOString().split('T')[0]);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAmount(val);
    setShowPayWith(val !== '' && parseFloat(val) > 0);
  };

  const buildTransaction = (): Omit<Transaction, 'id'> | null => {
    if (!amount || !category || !date) return null;

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    const timestamp = selectedDate.getTime() === today.getTime()
      ? Date.now()
      : selectedDate.getTime();

    return {
      amount: parseFloat(amount),
      category,
      timestamp,
      notes,
    };
  };

  const showToast = (message: string) => {
    if (!toastRef.current) return;
    toastRef.current.textContent = message;
    toastRef.current.classList.add('show');

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      toastRef.current?.classList.remove('show');
    }, 2500);
  };

  const resetForm = () => {
    setAmount('');
    setCategory('');
    setNotes('');
    setShowPayWith(false);
    setDate(new Date().toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDBReady) return;

    const tx = buildTransaction();
    if (!tx) {
      showToast('Please fill in all required fields');
      return;
    }

    try {
      await addTransaction(tx);
      showToast(`Saved ${formatRupiah(tx.amount)} for ${tx.category}`);
      window.dispatchEvent(new CustomEvent('transactionAdded'));
      setIsOpen(false);
      resetForm();
    } catch (e) {
      console.error('Error saving transaction:', e);
      showToast('Error saving transaction');
    }
  };

  const handlePayWith = async (app: string) => {
    if (!isDBReady) return;

    const tx = buildTransaction();
    if (!tx) {
      showToast('Please fill in all required fields');
      return;
    }

    tx.app = app;

    try {
      await addTransaction(tx);
      showToast(`Saved ${formatRupiah(tx.amount)} via ${app}`);
      window.dispatchEvent(new CustomEvent('transactionAdded'));

      const urls: Record<string, string> = {
        gopay: `gopay://pay?amount=${amount}&notes=${encodeURIComponent(notes || '')}`,
        jenius: `jenius://pay?amount=${amount}&notes=${encodeURIComponent(notes || '')}`,
        bca: `bca://pay?amount=${amount}&notes=${encodeURIComponent(notes || '')}`,
      };

      if (urls[app]) {
        try { window.open(urls[app], '_blank'); } catch {
          showToast(`Open ${app} manually to complete payment`);
        }
      }

      setIsOpen(false);
      resetForm();
    } catch (e) {
      console.error('Error saving transaction:', e);
      showToast('Error saving transaction');
    }
  };

  return (
    <>
      {/* FAB */}
      <button className="fab" onClick={() => setIsOpen(true)} aria-label="Add expense">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* Overlay */}
      <div
        className={`modal-overlay ${isOpen ? 'show' : ''}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Bottom Sheet */}
      <div className={`bottom-sheet ${isOpen ? 'show' : ''}`}>
        <div className="sheet-handle" />

        <div className="sheet-header">
          <h2 className="sheet-title">Add Expense</h2>
          <button className="sheet-close" onClick={() => setIsOpen(false)}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label" htmlFor="amount">Amount</label>
            <div className="amount-input-wrap">
              <span className="amount-prefix">Rp</span>
              <input
                type="number"
                id="amount"
                step="0.01"
                required
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={handleAmountChange}
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="category">Category</label>
            <select
              id="category"
              className="form-select"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select category</option>
              <option value="Food">Food</option>
              <option value="Transport">Transport</option>
              <option value="Shopping">Shopping</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="date">Date</label>
            <input
              type="date"
              id="date"
              className="form-input"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              className="form-textarea"
              rows={2}
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {showPayWith && (
            <div className="pay-with-section">
              <div className="pay-with-title">Quick Pay</div>
              <div className="pay-with-row">
                <button type="button" className="pay-btn" onClick={() => handlePayWith('gopay')}>
                  GoPay
                </button>
                <button type="button" className="pay-btn" onClick={() => handlePayWith('jenius')}>
                  Jenius
                </button>
                <button type="button" className="pay-btn" onClick={() => handlePayWith('bca')}>
                  BCA
                </button>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={() => setIsOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-save">
              Save
            </button>
          </div>
        </form>
      </div>

      {/* Toast */}
      <div ref={toastRef} className="toast" />
    </>
  );
}
