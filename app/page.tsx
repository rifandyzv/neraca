"use client";

import { useEffect, useState } from "react";
import Head from "next/head";
import Swiper from "../components/Swiper";
import ExpenseModal from "../components/ExpenseModal";
import RecentTransactions from "../components/RecentTransactions";
import DetailedReports from "../components/DetailedReports";
import SparklineChart from "../components/SparklineChart";
import { useIndexedDB } from "../hooks/useIndexedDB";

export default function Home() {
  const { isDBReady, getTransactionsByDateRange } = useIndexedDB();
  const [todayAmount, setTodayAmount] = useState<string>('Rp0');
  const [weekAmount, setWeekAmount] = useState<string>('Rp0');
  const [monthAmount, setMonthAmount] = useState<string>('Rp0');
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);
  const [activePeriod, setActivePeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [showReports, setShowReports] = useState<boolean>(false);

  // Initialize the dashboard
  useEffect(() => {
    // Load privacy mode state from localStorage
    const savedPrivacyMode = localStorage.getItem('pocketPalPrivacyMode');
    if (savedPrivacyMode !== null) {
      setPrivacyMode(JSON.parse(savedPrivacyMode));
    }

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

  // Handle slide change
  const handleSlideChange = (index: number) => {
    let period: 'daily' | 'weekly' | 'monthly';
    switch (index) {
      case 0:
        period = 'monthly';
        break;
      case 1:
        period = 'weekly';
        break;
      case 2:
        period = 'daily';
        break;
      default:
        period = 'monthly';
    }
    
    setActivePeriod(period);
    // Dispatch event for sparkline chart
    window.dispatchEvent(new CustomEvent('periodChange', { detail: period }));
  };

  // Handle external script loading
  useEffect(() => {
    const loadScript = (src: string, onLoadCallback?: () => void) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      if (onLoadCallback) {
        script.onload = onLoadCallback;
      }
      document.body.appendChild(script);
    };
    
    // Load Lucide icons
    loadScript('https://unpkg.com/lucide@0.259.0/dist/umd/lucide.min.js', () => {
      if (typeof window !== "undefined" && (window as any).lucide) {
        (window as any).lucide.createIcons();
      }
    });
    
    // Load ApexCharts
    loadScript('https://cdn.jsdelivr.net/npm/apexcharts');
  }, []);

  // Handle view details button click
  const handleViewDetails = () => {
    setShowReports(true);
    const reportsScreen = document.getElementById('reportsScreen');
    if (reportsScreen) {
      reportsScreen.style.display = 'block';
    }
  };

  // Handle back from reports button click
  const handleBackFromReports = () => {
    setShowReports(false);
    const reportsScreen = document.getElementById('reportsScreen');
    if (reportsScreen) {
      reportsScreen.style.display = 'none';
    }
  };

  // Add event listener for back button
  useEffect(() => {
    const backButton = document.getElementById('backFromReports');
    if (backButton) {
      backButton.addEventListener('click', handleBackFromReports);
    }
    
    return () => {
      if (backButton) {
        backButton.removeEventListener('click', handleBackFromReports);
      }
    };
  }, []);

  return (
    <>
      <Head>
        <title>Neraca - Personal Spending Tracker</title>
      </Head>
      
      <header>
        <img className="icon" src="/icons/icon.svg" alt="PocketPal" height="40" />
        <button id="privacyToggle" className="privacy-toggle" onClick={togglePrivacy}>
          <i data-lucide="eye"></i>
        </button>
      </header>
      
      <main>
        {/* Hero Display Swiper */}
        <Swiper onSlideChange={handleSlideChange}>
          <div>
            <span className="hero-label">THIS MONTH'S EXPENSES</span>
            <h1 id="monthAmount" className={`hero-amount ${privacyMode ? 'privacy-mode' : ''}`}>{monthAmount}</h1>
          </div>
          <div>
            <span className="hero-label">THIS WEEK'S EXPENSES</span>
            <h1 id="weekAmount" className={`hero-amount ${privacyMode ? 'privacy-mode' : ''}`}>{weekAmount}</h1>
          </div>
          <div>
            <span className="hero-label">TODAY'S EXPENSES</span>
            <h1 id="todayAmount" className={`hero-amount ${privacyMode ? 'privacy-mode' : ''}`}>{todayAmount}</h1>
          </div>
        </Swiper>
        
        {/* Unified Details Panel */}
        <div className="details-panel">
          {/* Dynamic Sparkline Chart */}
          <SparklineChart />
          
          {/* Recent Activity Header */}
          <h3 className="recent-activity-header">Recent Activity</h3>
          
          {/* Recent Transactions List */}
          <RecentTransactions />
          
          {/* View Details Button */}
          <button 
            id="viewDetailsBtn" 
            className="details-button"
            onClick={handleViewDetails}
          >
            Full Report & History →
          </button>
        </div>
        
        {/* Expense Modal Component */}
        <ExpenseModal />
      </main>
      
      {/* Reports & History Screen */}
      <DetailedReports />
    </>
  );
}