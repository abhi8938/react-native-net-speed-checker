// src/index.tsx

import { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NetSpeedChecker from './NativeNetSpeedChecker';

// --- Configuration ---
const TEST_FILE_URL = 'https://i.imgur.com/v15aE6I.jpeg'; // ~60KB image
const TEST_FILE_SIZE_BYTES = 60 * 1024;
const CHECK_INTERVAL_MS = 3000; // Check every 3 seconds

interface SpeedCheckOptions {
  onLowSpeed: () => void;
  thresholdKbps?: number;
  durationSeconds?: number;
}

/**
 * A React Hook to monitor internet speed and trigger a callback on
 * persistent low speeds.
 */
export const useInternetSpeedCheck = (
  {
    onLowSpeed,
    thresholdKbps = 25,
    durationSeconds = 10,
  }: SpeedCheckOptions
) => {
  const [currentSpeedKbps, setCurrentSpeedKbps] = useState(0);
  const [lowSpeedStreak, setLowSpeedStreak] = useState(0);

  const onLowSpeedRef = useRef(onLowSpeed);
  useEffect(() => {
    onLowSpeedRef.current = onLowSpeed;
  }, [onLowSpeed]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const checkSpeed = async () => {
      try {
        // This now calls our native module defined in the Spec
        const speedKbps = await NetSpeedChecker.checkInternetSpeed(
          TEST_FILE_URL,
          TEST_FILE_SIZE_BYTES
        );

        setCurrentSpeedKbps(Math.round(speedKbps));

        if (speedKbps < thresholdKbps) {
          setLowSpeedStreak((prevStreak) => {
            const newStreak = prevStreak + CHECK_INTERVAL_MS / 1000;
            if (newStreak >= durationSeconds) {
              onLowSpeedRef.current?.();
              return 0; // Reset after firing
            }
            return newStreak;
          });
        } else {
          setLowSpeedStreak(0); // Speed is good, reset
        }
      } catch (error) {
        console.error(
          "[react-native-net-speed-checker] Speed check failed:",
          error
        );
        setCurrentSpeedKbps(0);
        // Consider an error as a low-speed event
        setLowSpeedStreak(
          (prevStreak) => prevStreak + CHECK_INTERVAL_MS / 1000
        );
      }
    };

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && !intervalId) {
        intervalId = setInterval(checkSpeed, CHECK_INTERVAL_MS);
      } else if (nextAppState.match(/inactive|background/) && intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
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