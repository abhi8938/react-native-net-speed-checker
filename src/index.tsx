// src/index.tsx (Final version with useRef fix and full logging)

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
  onComplete?: (finalStatus: DiagnosticStatus) => void;
  speedThresholdKbps?: number;
}

const TOTAL_CHECK_LIMIT = 3; // Exit condition for "fast" speed
const SLOW_CHECK_THRESHOLD = 2; // Exit condition for "slow" speed
const SPEED_CHECK_INTERVAL_MS = 2500;

export const useNetworkDiagnostic = ({
  isRunning,
  onComplete,
  speedThresholdKbps = 400,
}: DiagnosticOptions) => {
  const [status, setStatus] = useState<DiagnosticStatus>('idle');
  const [currentSpeedKbps, setCurrentSpeedKbps] = useState(0);

  // --- REFS FOR PERSISTENCE ---
  const totalChecksRef = useRef(0);
  const slowChecksRef = useRef(0);
  const isTransitioningRef = useRef(false); // Our strict gatekeeper
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
      totalChecksRef.current = 0;
      slowChecksRef.current = 0;
      isTransitioningRef.current = false; // Reset the gatekeeper
      setCurrentSpeedKbps(0);
      setStatus('checking_initial');
      return;
    }

    if (status === 'checking_initial') {
      console.log('[Diagnostic] Step 1: Executing initial connection check.');
      NetSpeedChecker.checkInternetSpeed(TEST_FILE_URL, TEST_FILE_SIZE_BYTES)
        .then(() => setStatus('initial_passed'))
        .catch(() => setStatus('initial_failed'));
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
        const currentCheckNumber = totalChecksRef.current + 1;
        if (
          currentCheckNumber > TOTAL_CHECK_LIMIT ||
          isTransitioningRef.current
        ) {
          return; // Don't fire new checks if we are done or transitioning
        }

        console.log(
          `[Diagnostic] - Firing speed check #${currentCheckNumber} of ${TOTAL_CHECK_LIMIT}...`
        );

        NetSpeedChecker.checkInternetSpeed(TEST_FILE_URL, TEST_FILE_SIZE_BYTES)
          .then((speed) => {
            const roundedSpeed = Math.round(speed);
            setCurrentSpeedKbps(roundedSpeed);
            if (speed <= optionsRef.current.speedThresholdKbps) {
              slowChecksRef.current += 1;
              console.log(
                `[Diagnostic] - SLOW SPEED DETECTED (${roundedSpeed} kbps). Slow count: ${slowChecksRef.current}`
              );
            }
          })
          .catch(() => {
            slowChecksRef.current += 1;
            console.error(
              `[Diagnostic] - CHECK FAILED. Slow count: ${slowChecksRef.current}`
            );
          })
          .finally(() => {
            totalChecksRef.current += 1;
            console.log(
              `[Diagnostic] - Promise for check #${currentCheckNumber} resolved. Total checks: ${totalChecksRef.current}`
            );

            // THE STRICTLY GUARDED TRANSITION LOGIC
            if (isTransitioningRef.current) return;

            if (slowChecksRef.current >= SLOW_CHECK_THRESHOLD) {
              isTransitioningRef.current = true; // LOCK THE GATE
              console.log(
                '[Diagnostic] - Slow check threshold met. Stopping interval and setting status to speed_slow.'
              );
              if (intervalId) clearInterval(intervalId);
              setStatus('speed_slow');
            } else if (totalChecksRef.current >= TOTAL_CHECK_LIMIT) {
              isTransitioningRef.current = true; // LOCK THE GATE
              console.log(
                '[Diagnostic] - Total check limit met. Stopping interval and setting status to speed_fast.'
              );
              if (intervalId) clearInterval(intervalId);
              setStatus('speed_fast');
            }
          });
      }, SPEED_CHECK_INTERVAL_MS);
    } else if (status === 'speed_slow' || status === 'speed_fast') {
      console.log('[Diagnostic] Step 4: Executing final confirmation check.');
      setStatus('finalizing');
    } else if (status === 'finalizing') {
      NetSpeedChecker.checkInternetSpeed(TEST_FILE_URL, TEST_FILE_SIZE_BYTES)
        .then(() => setStatus('success'))
        .catch(() => setStatus('timeout'));
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
