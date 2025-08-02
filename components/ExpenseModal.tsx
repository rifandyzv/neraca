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

export default function ExpenseModal() {
  const { isDBReady, addTransaction } = useIndexedDB();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [showPayWith, setShowPayWith] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');

  // Set default date to today
  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setDate(formattedDate);
  }, []);

  // Handle amount input change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    setShowPayWith(value !== '' && parseFloat(value) > 0);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isDBReady) {
      alert('Database is not ready yet');
      return;
    }
    
    if (!amount || !category || !date) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Create timestamp
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    let timestamp: number;
    if (selectedDate.getTime() === today.getTime()) {
      // If date is today, use current time
      timestamp = new Date().getTime();
    } else {
      // If date is not today, use start of selected day
      timestamp = selectedDate.getTime();
    }
    
    // Create transaction object
    const transaction: Omit<Transaction, 'id'> = {
      amount: parseFloat(amount),
      category,
      timestamp,
      notes,
      app: paymentMethod
    };
    
    try {
      // Save transaction to IndexedDB
      await addTransaction(transaction);
      
      // Show success message
      showToast(`Saved ${formatRupiah(transaction.amount)} for ${transaction.category}`);
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('transactionAdded'));
      
      // Close modal
      setIsOpen(false);
      
      // Reset form
      setAmount('');
      setCategory('');
      setNotes('');
      setPaymentMethod('');
      setShowPayWith(false);
      
      // Set date back to today
      const todayDate = new Date();
      const formattedDate = todayDate.toISOString().split('T')[0];
      setDate(formattedDate);
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Error saving transaction');
    }
  };

  // Handle "Pay With" button click
  const handlePayWith = async (app: string) => {
    setPaymentMethod(app);
    
    if (!isDBReady) {
      alert('Database is not ready yet');
      return;
    }
    
    if (!amount || !category || !date) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Create timestamp
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    let timestamp: number;
    if (selectedDate.getTime() === today.getTime()) {
      // If date is today, use current time
      timestamp = new Date().getTime();
    } else {
      // If date is not today, use start of selected day
      timestamp = selectedDate.getTime();
    }
    
    // Create transaction object
    const transaction: Omit<Transaction, 'id'> = {
      amount: parseFloat(amount),
      category,
      timestamp,
      notes,
      app
    };
    
    try {
      // Save transaction to IndexedDB
      await addTransaction(transaction);
      
      // Show success message
      showToast(`Saved ${formatRupiah(transaction.amount)} for ${transaction.category} via ${app}`);
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('transactionAdded'));
      
      // Try to open the app (might not work on all browsers/devices)
      let url: string;
      switch(app) {
        case 'gopay':
          url = `gopay://pay?amount=${amount}&notes=${encodeURIComponent(notes || '')}`;
          break;
        case 'jenius':
          url = `jenius://pay?amount=${amount}&notes=${encodeURIComponent(notes || '')}`;
          break;
        case 'bca':
          url = `bca://pay?amount=${amount}&notes=${encodeURIComponent(notes || '')}`;
          break;
        default:
          alert('Unsupported payment app');
          return;
      }
      
      try {
        window.open(url, '_blank');
      } catch (e) {
        // Fallback for browsers that block popups
        alert(`Please manually open ${app} and send ${formatRupiah(parseFloat(amount))}, then return here.`);
      }
      
      // Close modal
      setIsOpen(false);
      
      // Reset form
      setAmount('');
      setCategory('');
      setNotes('');
      setPaymentMethod('');
      setShowPayWith(false);
      
      // Set date back to today
      const todayDate = new Date();
      const formattedDate = todayDate.toISOString().split('T')[0];
      setDate(formattedDate);
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Error saving transaction');
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

  // Show toast notification
  const showToast = (message: string) => {
    // Create toast element
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = '#333';
    toast.style.color = 'white';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '5px';
    toast.style.zIndex = '10000';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    
    document.body.appendChild(toast);
    
    // Fade in
    setTimeout(() => {
      toast.style.opacity = '1';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  };

  return (
    <div>
      {/* Add Expense Button */}
      <button 
        id="addExpense" 
        className="fab"
        onClick={() => setIsOpen(true)}
      >
        <i data-lucide="plus" className="fab-icon"></i>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="modal show" style={{ display: 'block' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add Expense</h2>
              <span className="close" onClick={() => setIsOpen(false)}>&times;</span>
            </div>
            <form id="expenseForm" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="amount">Amount (Rp)</label>
                <input 
                  type="number" 
                  id="amount" 
                  step="0.01" 
                  required 
                  value={amount}
                  onChange={handleAmountChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select 
                  id="category" 
                  required 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Select a category</option>
                  <option value="Food">Food</option>
                  <option value="Transport">Transport</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="date">Date</label>
                <input 
                  type="date" 
                  id="date" 
                  required 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="notes">Notes (optional)</label>
                <textarea 
                  id="notes" 
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
              </div>
              {showPayWith && (
                <div id="payWithSection" style={{ marginTop: '20px' }}>
                  <h3>Pay with:</h3>
                  <div className="btn-group">
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      data-app="gopay"
                      onClick={() => handlePayWith('gopay')}
                    >
                      Gopay
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      data-app="jenius"
                      onClick={() => handlePayWith('jenius')}
                    >
                      Jenius
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      data-app="bca"
                      onClick={() => handlePayWith('bca')}
                    >
                      BCA
                    </button>
                  </div>
                </div>
              )}
              <div className="btn-group" style={{ marginTop: '20px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}