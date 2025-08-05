// src/index.tsx (New useNetworkDiagnostic Hook)

import { useState, useEffect, useRef } from 'react';
import NetSpeedChecker from './NativeNetSpeedChecker';

// --- Configuration ---
const TEST_FILE_URL = 'https://i.imgur.com/v15aE6I.jpeg';
const TEST_FILE_SIZE_BYTES = 60 * 1024;

export type DiagnosticStatus =
  | 'idle' // Not running
  | 'checking_initial' // Step 1: Initial check running
  | 'initial_failed' // Step 1: Result
  | 'initial_passed' // Step 2: Result
  | 'checking_speed' // Step 3: 7s speed check running
  | 'speed_slow' // Step 3: Result
  | 'speed_fast' // Step 3: Result
  | 'finalizing' // Step 4: Final check running
  | 'timeout' // Step 4: Result
  | 'success'; // Step 4: Result

interface DiagnosticOptions {
  isRunning: boolean; // Controls the process
  onComplete?: () => void; // Callback when the process finishes
  speedThresholdKbps?: number;
}

export const useNetworkDiagnostic = ({
  isRunning,
  onComplete,
  speedThresholdKbps = 400,
}: DiagnosticOptions) => {
  const [status, setStatus] = useState<DiagnosticStatus>('idle');
  const [currentSpeedKbps, setCurrentSpeedKbps] = useState(0);

  // Refs to hold timers so we can clear them on termination
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanupTimers = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    intervalRef.current = null;
    timeoutRef.current = null;
  };

  useEffect(() => {
    // --- Step 5 & 6: Control Logic ---
    if (!isRunning) {
      cleanupTimers();
      setStatus('idle');
      setCurrentSpeedKbps(0);
      return;
    }

    // Start the process if it's idle and isRunning becomes true
    if (status === 'idle' && isRunning) {
      setStatus('checking_initial');
    }

    // --- State Machine ---

    // Step 1 & 2: Initial Connection Check
    if (status === 'checking_initial') {
      (async () => {
        try {
          await NetSpeedChecker.checkInternetSpeed(
            TEST_FILE_URL,
            TEST_FILE_SIZE_BYTES
          );
          setStatus('initial_passed');
        } catch (error) {
          console.error('[Diagnostic] Initial check failed:', error);
          setStatus('initial_failed');
        }
      })();
    }

    // Step 3: 7-Second Speed Check Window
    if (status === 'initial_passed') {
      setStatus('checking_speed');
      let isSlowDetected = false;

      // Start an interval to check speed
      intervalRef.current = setInterval(async () => {
        try {
          const speed = await NetSpeedChecker.checkInternetSpeed(
            TEST_FILE_URL,
            TEST_FILE_SIZE_BYTES
          );
          setCurrentSpeedKbps(Math.round(speed));
          if (speed <= speedThresholdKbps) {
            isSlowDetected = true;
          }
        } catch (e) {
          isSlowDetected = true; // Treat errors as slow speed
        }
      }, 2000); // Check every 2 seconds

      // Set a timeout for 7 seconds to end this phase
      timeoutRef.current = setTimeout(() => {
        cleanupTimers(); // Stop the interval
        if (isSlowDetected) {
          setStatus('speed_slow');
        } else {
          setStatus('speed_fast');
        }
      }, 7000);
    }

    // Step 4: Final Check (after speed check is done)
    if (status === 'speed_slow' || status === 'speed_fast') {
      setStatus('finalizing');
      (async () => {
        try {
          await NetSpeedChecker.checkInternetSpeed(
            TEST_FILE_URL,
            TEST_FILE_SIZE_BYTES
          );
          setStatus('success');
        } catch (error) {
          console.error('[Diagnostic] Final check failed (timeout):', error);
          setStatus('timeout');
        }
      })();
    }

    // Process has finished, call onComplete callback
    if (
      status === 'success' ||
      status === 'timeout' ||
      status === 'initial_failed'
    ) {
      onComplete?.();
    }

    // Cleanup function to stop timers if the hook unmounts or isRunning becomes false
    return cleanupTimers;
  }, [isRunning, status, speedThresholdKbps, onComplete]);

  return { status, currentSpeedKbps };
};
