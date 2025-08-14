import { useState, useEffect, useRef } from 'react';
import NetSpeedChecker from './NativeNetSpeedChecker';

// --- Configuration ---
const TEST_FILE_URL = 'https://i.imgur.com/v15aE6I.jpeg';
const TEST_FILE_SIZE_BYTES = 60 * 1024;

export type DiagnosticStatus =
  | 'idle'
  | 'checking_initial'
  | 'initial_failed'
  | 'initial_passed'
  | 'checking_speed'
  | 'speed_slow'
  | 'speed_fast'
  | 'finalizing'
  | 'timeout'
  | 'success';

interface DiagnosticOptions {
  isRunning: boolean;
  onComplete?: (finalStatus: DiagnosticStatus) => void; // Pass the final status back
  speedThresholdKbps?: number;
}

export const useNetworkDiagnostic = ({
  isRunning,
  onComplete,
  speedThresholdKbps = 400,
}: DiagnosticOptions) => {
  const [status, setStatus] = useState<DiagnosticStatus>('idle');
  const [currentSpeedKbps, setCurrentSpeedKbps] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use a ref to hold the latest onComplete callback to avoid stale closures
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const cleanupTimers = () => {
    if (intervalRef.current) {
      console.log('[Diagnostic] Clearing speed check interval.');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      console.log('[Diagnostic] Clearing 7-second timeout.');
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    // --- Control Logic ---
    if (!isRunning) {
      if (status !== 'idle') {
        console.log(
          '[Diagnostic] isRunning set to false. Terminating and resetting to idle.'
        );
        cleanupTimers();
        setStatus('idle');
        setCurrentSpeedKbps(0);
      }
      return;
    }

    // --- Start Logic ---
    if (status === 'idle' && isRunning) {
      console.log('[Diagnostic] Process started. Moving to checking_initial.');
      setStatus('checking_initial');
    }

    // --- State Machine ---

    // Step 1 & 2: Initial Connection Check
    if (status === 'checking_initial') {
      console.log('[Diagnostic] Step 1: Executing initial connection check.');
      (async () => {
        try {
          await NetSpeedChecker.checkInternetSpeed(
            TEST_FILE_URL,
            TEST_FILE_SIZE_BYTES
          );
          console.log('[Diagnostic] Step 2: Initial check passed.');
          setStatus('initial_passed');
        } catch (error) {
          console.error('[Diagnostic] Step 1: Initial check failed!', error);
          setStatus('initial_failed');
        }
      })();
    }

    // Step 3: 7-Second Speed Check Window
    if (status === 'initial_passed') {
      console.log('[Diagnostic] Step 3: Starting 7-second speed check window.');
      setStatus('checking_speed');
      let isSlowDetected = false;

      intervalRef.current = setInterval(async () => {
        console.log('[Diagnostic] - Checking speed (during 7s window)...');
        try {
          const speed = await NetSpeedChecker.checkInternetSpeed(
            TEST_FILE_URL,
            TEST_FILE_SIZE_BYTES
          );
          const roundedSpeed = Math.round(speed);
          setCurrentSpeedKbps(roundedSpeed);
          if (speed <= speedThresholdKbps) {
            console.log(
              `[Diagnostic] - Slow speed detected (${roundedSpeed} kbps). Flagging as slow.`
            );
            isSlowDetected = true;
          } else {
            console.log(`[Diagnostic] - Speed is good (${roundedSpeed} kbps).`);
          }
        } catch (e) {
          console.error(
            '[Diagnostic] - Speed check error during 7s window. Flagging as slow.',
            e
          );
          isSlowDetected = true;
        }
      }, 2000);

      timeoutRef.current = setTimeout(() => {
        console.log('[Diagnostic] - 7-second window finished.');
        cleanupTimers();
        if (isSlowDetected) {
          console.log(
            '[Diagnostic] Step 3 Result: Speed was slow. Moving to speed_slow.'
          );
          setStatus('speed_slow');
        } else {
          console.log(
            '[Diagnostic] Step 3 Result: Speed was fast. Moving to speed_fast.'
          );
          setStatus('speed_fast');
        }
      }, 7000);
    }

    // Step 4: Final Check
    if (status === 'speed_slow' || status === 'speed_fast') {
      console.log('[Diagnostic] Step 4: Executing final confirmation check.');
      setStatus('finalizing');
      (async () => {
        try {
          await NetSpeedChecker.checkInternetSpeed(
            TEST_FILE_URL,
            TEST_FILE_SIZE_BYTES
          );
          console.log('[Diagnostic] Step 4 Result: Final check successful.');
          setStatus('success');
        } catch (error) {
          console.error(
            '[Diagnostic] Step 4 Result: Final check failed (timeout).',
            error
          );
          setStatus('timeout');
        }
      })();
    }

    // --- Completion Logic ---
    // This logic now runs whenever the status changes to a terminal state.
    if (
      status === 'success' ||
      status === 'timeout' ||
      status === 'initial_failed'
    ) {
      console.log(
        `[Diagnostic] Process finished with terminal status: ${status}. Calling onComplete.`
      );
      onCompleteRef.current?.(status);
    }

    // Cleanup function runs on unmount or if isRunning changes to false
    return cleanupTimers;
  }, [isRunning, status, speedThresholdKbps]);

  return { status, currentSpeedKbps };
};
