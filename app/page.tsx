"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Swiper from "../components/Swiper";
import ExpenseModal from "../components/ExpenseModal";
import RecentTransactions from "../components/RecentTransactions";
import DetailedReports from "../components/DetailedReports";
import SparklineChart from "../components/SparklineChart";
import { useIndexedDB } from "../hooks/useIndexedDB";

const PERIODS = ['monthly', 'weekly', 'daily'] as const;
const PERIOD_LABELS = ['Month', 'Week', 'Today'] as const;
const HERO_LABELS = ["This month's expenses", "This week's expenses", "Today's expenses"] as const;
const HERO_SUBTITLES = ['spent this month', 'spent this week', 'spent today'] as const;

export default function Home() {
  const { isDBReady, getTransactionsByDateRange } = useIndexedDB();
  const [todayAmount, setTodayAmount] = useState<string>('Rp0');
  const [weekAmount, setWeekAmount] = useState<string>('Rp0');
  const [monthAmount, setMonthAmount] = useState<string>('Rp0');
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showReports, setShowReports] = useState<boolean>(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  const activePeriod = PERIODS[currentIndex];
  const amounts = [monthAmount, weekAmount, todayAmount];

  // Initialize
  useEffect(() => {
    const saved = localStorage.getItem('pocketPalPrivacyMode');
    if (saved !== null) setPrivacyMode(JSON.parse(saved));
    updateDashboard();
  }, [isDBReady]);

  // Listen for new transactions
  useEffect(() => {
    const handler = () => updateDashboard();
    window.addEventListener('transactionAdded', handler);
    return () => window.removeEventListener('transactionAdded', handler);
  }, [isDBReady]);

  // Load ApexCharts
  useEffect(() => {
    if (!document.querySelector('script[src*="apexcharts"]')) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/apexcharts';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const formatRupiah = (amount: number): string => {
    const formatted = parseFloat(amount.toString()).toFixed(2);
    const parts = formatted.split('.');
    const withThousands = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (parts[1] === '00') return `Rp${withThousands}`;
    return `Rp${withThousands},${parts[1]}`;
  };

  const updateDashboard = async () => {
    if (!isDBReady) return;

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const dayOfWeek = today.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - adjustedDay);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const endOfDay = startOfDay + 86400000;
    const endOfWeek = startOfWeek.getTime() + 604800000;
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getTime() + 86400000;

    try {
      const [todayTx, weekTx, monthTx] = await Promise.all([
        getTransactionsByDateRange(startOfDay, endOfDay),
        getTransactionsByDateRange(startOfWeek.getTime(), endOfWeek),
        getTransactionsByDateRange(startOfMonth, endOfMonth),
      ]);
      setTodayAmount(formatRupiah(todayTx.reduce((s, t) => s + t.amount, 0)));
      setWeekAmount(formatRupiah(weekTx.reduce((s, t) => s + t.amount, 0)));
      setMonthAmount(formatRupiah(monthTx.reduce((s, t) => s + t.amount, 0)));
    } catch (e) {
      console.error('Error updating dashboard:', e);
    }
  };

  const handleIndexChange = useCallback((index: number) => {
    setCurrentIndex(index);
    window.dispatchEvent(new CustomEvent('periodChange', { detail: PERIODS[index] }));
  }, []);

  const togglePrivacy = () => {
    const next = !privacyMode;
    setPrivacyMode(next);
    localStorage.setItem('pocketPalPrivacyMode', JSON.stringify(next));
  };

  // Compute indicator position for segmented control
  const getIndicatorStyle = () => {
    const width = 100 / 3;
    return {
      left: `calc(${currentIndex * width}% + 4px)`,
      width: `calc(${width}% - 8px)`,
    };
  };

  // Summary cards: show the two periods NOT currently active
  const summaryCards = PERIODS
    .map((period, i) => ({ period, label: PERIOD_LABELS[i], amount: amounts[i], index: i }))
    .filter((_, i) => i !== currentIndex);

  return (
    <>
      <header className="app-header">
        <h1 className="app-logo">neraca</h1>
        <button className="privacy-btn" onClick={togglePrivacy} aria-label="Toggle privacy">
          {privacyMode ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )}
        </button>
      </header>

      <main className="app-main">
        {/* Period Selector */}
        <div className="period-selector" ref={selectorRef}>
          {PERIOD_LABELS.map((label, i) => (
            <button
              key={label}
              className={`period-btn ${i === currentIndex ? 'active' : ''}`}
              onClick={() => handleIndexChange(i)}
            >
              {label}
            </button>
          ))}
          <div className="period-indicator" style={getIndicatorStyle()} />
        </div>

        {/* Hero Amount */}
        <section className="hero-section">
          <div className="hero-glow" />
          <Swiper currentIndex={currentIndex} onIndexChange={handleIndexChange}>
            {HERO_LABELS.map((label, i) => (
              <div key={label}>
                <span className="hero-label">{label}</span>
                <h2 className={`hero-amount ${privacyMode ? 'privacy-mode' : ''}`}>
                  {amounts[i]}
                </h2>
                <p className="hero-subtitle">{HERO_SUBTITLES[i]}</p>
              </div>
            ))}
          </Swiper>
        </section>

        {/* Summary Cards */}
        <div className="summary-row">
          {summaryCards.map(card => (
            <button
              key={card.period}
              className="summary-card"
              onClick={() => handleIndexChange(card.index)}
            >
              <span className="summary-label">{card.label}</span>
              <span className={`summary-value ${privacyMode ? 'privacy-mode' : ''}`}>
                {card.amount}
              </span>
            </button>
          ))}
        </div>

        {/* Sparkline Chart */}
        <div className="chart-section">
          <SparklineChart />
        </div>

        {/* Recent Activity */}
        <section className="activity-section">
          <div className="section-header">
            <h3 className="section-title">Recent</h3>
            <button className="section-link" onClick={() => {
              setShowReports(true);
              const el = document.getElementById('reportsScreen');
              if (el) el.style.display = 'block';
            }}>
              See all
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
          <RecentTransactions />
        </section>

        <ExpenseModal />
      </main>

      <DetailedReports />
    </>
  );
}
