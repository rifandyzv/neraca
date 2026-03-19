"use client";

import React, { useRef } from 'react';

interface SwiperProps {
  currentIndex: number;
  onIndexChange: (index: number) => void;
  children: React.ReactNode;
}

export default function Swiper({ currentIndex, onIndexChange, children }: SwiperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const endXRef = useRef(0);
  const endYRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    endXRef.current = e.touches[0].clientX;
    endYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    endXRef.current = e.touches[0].clientX;
    endYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const diffX = startXRef.current - endXRef.current;
    const diffY = startYRef.current - endYRef.current;
    const count = React.Children.count(children);

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0 && currentIndex < count - 1) {
        onIndexChange(currentIndex + 1);
      } else if (diffX < 0 && currentIndex > 0) {
        onIndexChange(currentIndex - 1);
      }
    }
  };

  const translateX = -currentIndex * 100;

  return (
    <div className="swiper-container">
      <div
        className="swiper-track"
        ref={containerRef}
        style={{ transform: `translateX(${translateX}%)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {React.Children.map(children, (child, index) => (
          <div key={index} className="swiper-slide">
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
