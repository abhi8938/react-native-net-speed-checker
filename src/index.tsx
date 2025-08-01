// src/index.tsx (Corrected Version)

import { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NetSpeedChecker from './NativeNetSpeedChecker';

// --- Configuration ---
const TEST_FILE_URL = 'https://i.imgur.com/v15aE6I.jpeg'; // ~60KB image
const TEST_FILE_SIZE_BYTES = 60 * 1024;
const CHECK_INTERVAL_MS = 2500; // Check every 2.5 seconds

interface SpeedCheckOptions {
  onLowSpeed: () => void;
  thresholdKbps?: number;
  durationSeconds?: number;
}

export const useInternetSpeedCheck = ({
  onLowSpeed,
  thresholdKbps = 25,
  durationSeconds = 10,
}: SpeedCheckOptions) => {
  const [currentSpeedKbps, setCurrentSpeedKbps] = useState(0);
  const [lowSpeedStreak, setLowSpeedStreak] = useState(0);

  const onLowSpeedRef = useRef(onLowSpeed);
  useEffect(() => {
    onLowSpeedRef.current = onLowSpeed;
  }, [onLowSpeed]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const checkSpeed = async () => {
      let speedKbps = 0; // Default to 0 (low speed)
      try {
        console.log('[NetSpeedChecker] - Running speed check...');
        speedKbps = await NetSpeedChecker.checkInternetSpeed(
          TEST_FILE_URL,
          TEST_FILE_SIZE_BYTES
        );
      } catch (error) {
        console.error('[NetSpeedChecker] - Speed check failed:', error);
        // On error, we keep speedKbps at 0, treating it as a low-speed event.
      }

      setCurrentSpeedKbps(Math.round(speedKbps));

      // --- UNIFIED LOGIC BLOCK ---
      if (speedKbps < thresholdKbps) {
        // This block now handles both successful low-speed checks AND errors.
        setLowSpeedStreak((prevStreak) => {
          const newStreak = prevStreak + CHECK_INTERVAL_MS / 1000;
          console.log(
            `[NetSpeedChecker] - Low speed detected. Current streak: ${newStreak}s`
          );

          if (newStreak >= durationSeconds) {
            console.log(
              '[NetSpeedChecker] - Low speed duration threshold met. Firing callback!'
            );
            onLowSpeedRef.current?.();
            return 0; // Reset after firing
          }
          return newStreak;
        });
      } else {
        // Speed is good, reset the streak
        console.log(
          `[NetSpeedChecker] - Speed is good (${Math.round(speedKbps)} kbps). Resetting streak.`
        );
        setLowSpeedStreak(0);
      }
    };

    const handleAppStateChange = (nextAppState: string) => {
      // ... (no changes needed here)
    };

    // ... (no changes needed in the rest of the useEffect)
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );
    if (AppState.currentState === 'active') {
      checkSpeed(); // Initial check
      intervalId = setInterval(checkSpeed, CHECK_INTERVAL_MS);
    }

    return () => {
      subscription.remove();
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [thresholdKbps, durationSeconds]);

  return { currentSpeedKbps, lowSpeedStreak };
};
