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

  const onCompleteRef = useRef(onComplete);
  const optionsRef = useRef({ speedThresholdKbps });

  useEffect(() => {
    onCompleteRef.current = onComplete;
    optionsRef.current.speedThresholdKbps = speedThresholdKbps;
  }, [onComplete, speedThresholdKbps]);

  useEffect(() => {
    // Refs to hold timers for this specific run of the effect
    let intervalId: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    // --- START/STOP LOGIC ---
    if (!isRunning) {
      if (status !== 'idle') {
        console.log(
          '[Diagnostic] isRunning set to false. Terminating and resetting to idle.'
        );
        setStatus('idle');
        setCurrentSpeedKbps(0);
      }
      return;
    }

    if (status === 'idle' && isRunning) {
      console.log('[Diagnostic] Process started. Moving to checking_initial.');
      setStatus('checking_initial');
      return; // End this effect run, let the re-render handle the next step
    }

    // --- STATE MACHINE ACTIONS ---

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
        '[Diagnostic] Step 3: Starting 7-second speed check window. Setting status to checking_speed.'
      );
      // The ONLY action here is to set the status that will trigger the timers.
      setStatus('checking_speed');
    } else if (status === 'checking_speed') {
      // THIS IS THE KEY CHANGE. The timers are set HERE.
      // This state does not change itself, it waits for the timers to change it.
      console.log(
        '[Diagnostic] Now in checking_speed state. Setting up timers.'
      );
      let isSlowDetected = false;

      intervalId = setInterval(() => {
        console.log('[Diagnostic] - Checking speed (during 7s window)...');
        NetSpeedChecker.checkInternetSpeed(TEST_FILE_URL, TEST_FILE_SIZE_BYTES)
          .then((speed) => {
            setCurrentSpeedKbps(Math.round(speed));
            if (speed <= optionsRef.current.speedThresholdKbps)
              isSlowDetected = true;
          })
          .catch(() => {
            isSlowDetected = true;
          });
      }, 2000);

      timeoutId = setTimeout(() => {
        console.log('[Diagnostic] - 7-second window finished.');
        setStatus(isSlowDetected ? 'speed_slow' : 'speed_fast');
      }, 7000);
    } else if (status === 'speed_slow' || status === 'speed_fast') {
      console.log('[Diagnostic] Step 4: Executing final confirmation check.');
      setStatus('finalizing');
    } else if (status === 'finalizing') {
      // Also a key change. Finalizing is its own stable state.
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
    } else if (
      status === 'success' ||
      status === 'timeout' ||
      status === 'initial_failed'
    ) {
      console.log(
        `[Diagnostic] Process finished with terminal status: ${status}. Calling onComplete.`
      );
      onCompleteRef.current?.(status);
    }

    // The cleanup function for THIS RUN of the useEffect.
    return () => {
      if (intervalId) {
        console.log(
          `[Diagnostic] Cleaning up interval from a previous render (status was ${status}).`
        );
        clearInterval(intervalId);
      }
      if (timeoutId) {
        console.log(
          `[Diagnostic] Cleaning up timeout from a previous render (status was ${status}).`
        );
        clearInterval(timeoutId);
      }
    };
  }, [isRunning, status]);

  return { status, currentSpeedKbps };
};
