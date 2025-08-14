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

  // --- Use refs for ALL async operations and callbacks ---
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);
  const optionsRef = useRef({ speedThresholdKbps }); // Hold options

  useEffect(() => {
    onCompleteRef.current = onComplete;
    optionsRef.current.speedThresholdKbps = speedThresholdKbps;
  }, [onComplete, speedThresholdKbps]);

  const cleanupTimers = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    intervalRef.current = null;
    timeoutRef.current = null;
  };

  const runDiagnosticStep = (currentStatus: DiagnosticStatus) => {
    console.log(`[Diagnostic] Running step for status: ${currentStatus}`);

    switch (currentStatus) {
      case 'checking_initial':
        console.log('[Diagnostic] Step 1: Executing initial connection check.');
        NetSpeedChecker.checkInternetSpeed(TEST_FILE_URL, TEST_FILE_SIZE_BYTES)
          .then(() => {
            console.log('[Diagnostic] Step 2: Initial check passed.');
            setStatus('initial_passed');
          })
          .catch((error) => {
            console.error('[Diagnostic] Step 1: Initial check failed!', error);
            setStatus('initial_failed');
          });
        break;

      case 'initial_passed':
        console.log(
          '[Diagnostic] Step 3: Starting 7-second speed check window.'
        );
        setStatus('checking_speed');
        let isSlowDetected = false;

        intervalRef.current = setInterval(() => {
          console.log('[Diagnostic] - Checking speed (during 7s window)...');
          NetSpeedChecker.checkInternetSpeed(
            TEST_FILE_URL,
            TEST_FILE_SIZE_BYTES
          )
            .then((speed) => {
              const roundedSpeed = Math.round(speed);
              setCurrentSpeedKbps(roundedSpeed);
              if (speed <= optionsRef.current.speedThresholdKbps) {
                isSlowDetected = true;
              }
            })
            .catch(() => {
              isSlowDetected = true;
            });
        }, 2000);

        timeoutRef.current = setTimeout(() => {
          console.log('[Diagnostic] - 7-second window finished.');
          cleanupTimers();
          setStatus(isSlowDetected ? 'speed_slow' : 'speed_fast');
        }, 7000);
        break;

      case 'speed_slow':
      case 'speed_fast':
        console.log('[Diagnostic] Step 4: Executing final confirmation check.');
        setStatus('finalizing');
        NetSpeedChecker.checkInternetSpeed(TEST_FILE_URL, TEST_FILE_SIZE_BYTES)
          .then(() => {
            console.log('[Diagnostic] Step 4 Result: Final check successful.');
            setStatus('success');
          })
          .catch((error) => {
            console.error(
              '[Diagnostic] Step 4 Result: Final check failed (timeout).',
              error
            );
            setStatus('timeout');
          });
        break;

      case 'success':
      case 'timeout':
      case 'initial_failed':
        console.log(
          `[Diagnostic] Process finished with terminal status: ${currentStatus}. Calling onComplete.`
        );
        onCompleteRef.current?.(currentStatus);
        break;
    }
  };

  // The MAIN useEffect now has only TWO jobs:
  // 1. Start or stop the process.
  // 2. Call the action for the current state.
  useEffect(() => {
    if (isRunning) {
      if (status === 'idle') {
        // Start the whole machine
        console.log(
          '[Diagnostic] Process started. Moving to checking_initial.'
        );
        setStatus('checking_initial');
      } else {
        // Run the action for the current state
        runDiagnosticStep(status);
      }
    } else {
      // Termination logic
      if (status !== 'idle') {
        console.log(
          '[Diagnostic] isRunning set to false. Terminating and resetting to idle.'
        );
        cleanupTimers();
        setStatus('idle');
        setCurrentSpeedKbps(0);
      }
    }

    // The cleanup function is now only for when the component unmounts
    return cleanupTimers;
  }, [isRunning, status]);

  return { status, currentSpeedKbps };
};
