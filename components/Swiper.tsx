"use client";

import React, { useState, useEffect, useRef } from 'react';

interface SwiperProps {
  onSlideChange?: (index: number) => void;
  children: React.ReactNode;
}

export default function Swiper({ onSlideChange, children }: SwiperProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const endXRef = useRef(0);
  const endYRef = useRef(0);

  // Handle dot click
  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
    if (onSlideChange) {
      onSlideChange(index);
    }
  };

  // Handle swipe events
  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    endXRef.current = e.touches[0].clientX;
    endYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const diffX = startXRef.current - endXRef.current;
    const diffY = startYRef.current - endYRef.current;

    // Check if horizontal swipe is more significant than vertical
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
      if (diffX > 0 && currentIndex < React.Children.count(children) - 1) {
        // Swipe left
        setCurrentIndex(currentIndex + 1);
        if (onSlideChange) {
          onSlideChange(currentIndex + 1);
        }
      } else if (diffX < 0 && currentIndex > 0) {
        // Swipe right
        setCurrentIndex(currentIndex - 1);
        if (onSlideChange) {
          onSlideChange(currentIndex - 1);
        }
      }
    }
  };

  // Update position when currentIndex changes
  useEffect(() => {
    if (containerRef.current) {
      const translateX = -currentIndex * 100;
      containerRef.current.style.transform = `translateX(${translateX}%)`;
    }
  }, [currentIndex]);

  return (
    <div className="swiper-container">
      <div 
        className="swiper-wrapper"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {React.Children.map(children, (child, index) => (
          <div 
            key={index} 
            className="swiper-slide"
            style={{ minWidth: '100%' }}
          >
            {child}
          </div>
        ))}
      </div>
      {/* Pagination dots */}
      <div className="swiper-pagination">
        {React.Children.map(children, (_, index) => (
          <span 
            key={index}
            className={`dot ${index === currentIndex ? 'active' : ''}`}
            data-index={index}
            onClick={() => handleDotClick(index)}
          />
        ))}
      </div>
    </div>
  );
}