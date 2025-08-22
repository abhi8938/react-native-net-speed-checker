// src/index.tsx (Final version with counter-based logic)

import { useState, useEffect, useRef } from 'react';
import NetSpeedChecker from './NativeNetSpeedChecker';

// --- (Types and Options are the same) ---
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
  onComplete?: (finalStatus: DiagnosticStatus) => void;
  speedThresholdKbps?: number;
}

// How many times to check speed during the window.
const SPEED_CHECK_COUNT_LIMIT = 3;
// How often to check.
const SPEED_CHECK_INTERVAL_MS = 2000;

export const useNetworkDiagnostic = ({
  isRunning,
  onComplete,
  speedThresholdKbps = 400,
}: DiagnosticOptions) => {
  const [status, setStatus] = useState<DiagnosticStatus>('idle');
  const [currentSpeedKbps, setCurrentSpeedKbps] = useState(0);

  // --- REFS FOR PERSISTENCE ---
  const isSlowDetectedRef = useRef(false);
  const checkCountRef = useRef(0); // <-- NEW: Counter for checks
  const onCompleteRef = useRef(onComplete);
  const optionsRef = useRef({ speedThresholdKbps });

  useEffect(() => {
    onCompleteRef.current = onComplete;
    optionsRef.current.speedThresholdKbps = speedThresholdKbps;
  }, [onComplete, speedThresholdKbps]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (!isRunning) {
      if (status !== 'idle') setStatus('idle');
      return;
    }

    if (status === 'idle' && isRunning) {
      console.log('[Diagnostic] Process started. Moving to checking_initial.');
      isSlowDetectedRef.current = false;
      checkCountRef.current = 0; // <-- Reset counter at the start
      setCurrentSpeedKbps(0);
      setStatus('checking_initial');
      return;
    }

    if (status === 'checking_initial') {
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
    } else if (status === 'initial_passed') {
      console.log(
        '[Diagnostic] Step 3: Starting speed check window. Setting status to checking_speed.'
      );
      setStatus('checking_speed');
    } else if (status === 'checking_speed') {
      console.log(
        '[Diagnostic] Now in checking_speed state. Setting up interval.'
      );

      intervalId = setInterval(() => {
        // Increment the counter first
        checkCountRef.current += 1;
        console.log(
          `[Diagnostic] - Running speed check #${checkCountRef.current} of ${SPEED_CHECK_COUNT_LIMIT}...`
        );

        NetSpeedChecker.checkInternetSpeed(TEST_FILE_URL, TEST_FILE_SIZE_BYTES)
          .then((speed) => {
            const roundedSpeed = Math.round(speed);
            setCurrentSpeedKbps(roundedSpeed);
            if (speed <= optionsRef.current.speedThresholdKbps) {
              console.log(
                `[Diagnostic] - SLOW SPEED DETECTED (${roundedSpeed} kbps). Flagging as slow.`
              );
              isSlowDetectedRef.current = true;
            }
          })
          .catch((e) => {
            console.error(
              '[Diagnostic] - Speed check FAILED. Flagging as slow.',
              e
            );
            isSlowDetectedRef.current = true;
          })
          .finally(() => {
            // After every check, see if we're done
            if (checkCountRef.current >= SPEED_CHECK_COUNT_LIMIT) {
              console.log(
                '[Diagnostic] - Speed check window finished (check limit reached).'
              );
              if (intervalId) clearInterval(intervalId); // Stop the interval immediately
              setStatus(
                isSlowDetectedRef.current ? 'speed_slow' : 'speed_fast'
              );
            }
          });
      }, SPEED_CHECK_INTERVAL_MS);
    } else if (status === 'speed_slow' || status === 'speed_fast') {
      console.log('[Diagnostic] Step 4: Executing final confirmation check.');
      setStatus('finalizing');
    } else if (status === 'finalizing') {
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
    } else if (['success', 'timeout', 'initial_failed'].includes(status)) {
      console.log(
        `[Diagnostic] Process finished with terminal status: ${status}. Calling onComplete.`
      );
      onCompleteRef.current?.(status);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning, status]);

  return { status, currentSpeedKbps };
};
