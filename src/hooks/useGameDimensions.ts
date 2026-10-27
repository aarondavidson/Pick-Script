import { useState, useEffect, useCallback } from 'react';

interface GameDimensions {
  width: number;
  height: number;
  scale: number;
  isPortrait: boolean;
  safeAreaInsets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

// Base game dimensions (original design)
const BASE_WIDTH = 640;
const BASE_HEIGHT = 480;
const ASPECT_RATIO = BASE_WIDTH / BASE_HEIGHT;

export const useGameDimensions = (): GameDimensions => {
  const [dimensions, setDimensions] = useState<GameDimensions>({
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
    scale: 1,
    isPortrait: false,
    safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  const calculateDimensions = useCallback(() => {
    // Get safe area insets from CSS custom properties
    const computedStyle = getComputedStyle(document.documentElement);
    const safeAreaInsets = {
      top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10) || 0,
      right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10) || 0,
      bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10) || 0,
      left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10) || 0,
    };

    // Available viewport dimensions minus safe areas
    const availableWidth = window.innerWidth - safeAreaInsets.left - safeAreaInsets.right;
    const availableHeight = window.innerHeight - safeAreaInsets.top - safeAreaInsets.bottom;
    
    const isPortrait = availableHeight > availableWidth;
    
    // Reserve space for UI panels (verb panel, navigation, etc.)
    // On mobile portrait, we need more vertical space for UI
    const uiReservedHeight = isPortrait ? 200 : 120;
    const gameAreaHeight = availableHeight - uiReservedHeight;
    
    // Calculate dimensions maintaining aspect ratio
    let width: number;
    let height: number;
    
    if (availableWidth / gameAreaHeight > ASPECT_RATIO) {
      // Height constrained
      height = Math.min(gameAreaHeight, BASE_HEIGHT);
      width = height * ASPECT_RATIO;
    } else {
      // Width constrained
      width = Math.min(availableWidth, BASE_WIDTH);
      height = width / ASPECT_RATIO;
    }
    
    // Ensure minimum dimensions
    width = Math.max(width, 280);
    height = Math.max(height, 210);
    
    const scale = width / BASE_WIDTH;

    setDimensions({
      width,
      height,
      scale,
      isPortrait,
      safeAreaInsets,
    });
  }, []);

  useEffect(() => {
    calculateDimensions();
    
    // Recalculate on resize and orientation change
    window.addEventListener('resize', calculateDimensions);
    window.addEventListener('orientationchange', calculateDimensions);
    
    // Also recalculate when visual viewport changes (mobile keyboard, etc.)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', calculateDimensions);
    }
    
    return () => {
      window.removeEventListener('resize', calculateDimensions);
      window.removeEventListener('orientationchange', calculateDimensions);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', calculateDimensions);
      }
    };
  }, [calculateDimensions]);

  return dimensions;
};
