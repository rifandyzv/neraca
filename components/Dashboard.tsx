"use client";

import React, { useEffect, useState } from 'react';
import { useIndexedDB } from '../hooks/useIndexedDB';

// Types for our data
interface Transaction {
  id?: number;
  amount: number;
  category: string;
  timestamp: number;
  notes?: string;
  app?: string;
}

// Dashboard component
export default function Dashboard() {
  const { isDBReady, getTransactionsByDateRange } = useIndexedDB();
  const [todayAmount, setTodayAmount] = useState<string>('Rp0');
  const [weekAmount, setWeekAmount] = useState<string>('Rp0');
  const [monthAmount, setMonthAmount] = useState<string>('Rp0');
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);
  const [activePeriod, setActivePeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  // Initialize the dashboard
  useEffect(() => {
    // Load privacy mode state from localStorage
    const savedPrivacyMode = localStorage.getItem('pocketPalPrivacyMode');
    if (savedPrivacyMode !== null) {
      setPrivacyMode(JSON.parse(savedPrivacyMode));
    }

    // Set up event listeners
    const handleSlideChange = (index: number) => {
      switch (index) {
        case 0:
          setActivePeriod('monthly');
          break;
        case 1:
          setActivePeriod('weekly');
          break;
        case 2:
          setActivePeriod('daily');
          break;
      }
    };

    // Set up swiper
    const setupSwiper = () => {
      const dots = document.querySelectorAll('.dot');
      dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
          handleSlideChange(index);
        });
      });
    };

    setupSwiper();

    // Update dashboard
    updateDashboard();
  }, [isDBReady]);

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

  // Update dashboard amounts
  const updateDashboard = async () => {
    if (!isDBReady) return;
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    
    // Calculate start of week (Monday) correctly
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // Adjust to make Monday = 0, Sunday = 6
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - adjustedDay);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
    const endOfWeek = startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000;
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getTime() + 24 * 60 * 60 * 1000;
    
    try {
      // Get transactions for each period
      const todayTransactions = await getTransactionsByDateRange(startOfDay, endOfDay);
      const weekTransactions = await getTransactionsByDateRange(startOfWeek.getTime(), endOfWeek);
      const monthTransactions = await getTransactionsByDateRange(startOfMonth, endOfMonth);
      
      // Calculate totals
      const todayTotal = todayTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      const weekTotal = weekTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      const monthTotal = monthTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      
      setTodayAmount(formatRupiah(todayTotal));
      setWeekAmount(formatRupiah(weekTotal));
      setMonthAmount(formatRupiah(monthTotal));
    } catch (error) {
      console.error('Error updating dashboard:', error);
    }
  };

  // Toggle privacy mode
  const togglePrivacy = () => {
    const newPrivacyMode = !privacyMode;
    setPrivacyMode(newPrivacyMode);
    
    // Save privacy mode state to localStorage
    localStorage.setItem('pocketPalPrivacyMode', JSON.stringify(newPrivacyMode));
    
    // Update icon
    const eyeIcon = document.querySelector('#privacyToggle i');
    if (eyeIcon) {
      if (newPrivacyMode) {
        eyeIcon.setAttribute('data-lucide', 'eye-off');
      } else {
        eyeIcon.setAttribute('data-lucide', 'eye');
      }
      
      // Re-render icons if lucide is available
      if (typeof window !== 'undefined' && (window as any).lucide) {
        (window as any).lucide.createIcons();
      }
    }
  };

  return (
    <div>
      {/* The dashboard UI is already in the main page component */}
    </div>
  );
}