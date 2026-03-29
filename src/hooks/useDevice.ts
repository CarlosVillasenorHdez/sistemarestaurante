'use client';

import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

export interface DeviceInfo {
  type: DeviceType;
  orientation: Orientation;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  width: number;
  height: number;
}

function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return { type: 'desktop', orientation: 'landscape', isMobile: false, isTablet: false, isDesktop: true, isTouch: false, width: 1280, height: 800 };
  }

  const w = window.innerWidth;
  const h = window.innerHeight;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const orientation: Orientation = w > h ? 'landscape' : 'portrait';

  // Breakpoints: mobile <768, tablet 768-1199, desktop 1200+
  // Also consider touch + size for tablet detection
  let type: DeviceType;
  if (w < 768) {
    type = 'mobile';
  } else if (w < 1200 || (isTouch && w < 1400)) {
    type = 'tablet';
  } else {
    type = 'desktop';
  }

  return {
    type,
    orientation,
    isMobile:  type === 'mobile',
    isTablet:  type === 'tablet',
    isDesktop: type === 'desktop',
    isTouch,
    width: w,
    height: h,
  };
}

export function useDevice(): DeviceInfo {
  const [device, setDevice] = useState<DeviceInfo>(getDeviceInfo);

  useEffect(() => {
    const update = () => setDevice(getDeviceInfo());

    // Listen for resize and orientation changes
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    screen.orientation?.addEventListener?.('change', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      screen.orientation?.removeEventListener?.('change', update);
    };
  }, []);

  return device;
}
