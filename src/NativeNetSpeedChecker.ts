// src/NativeNetSpeedChecker.ts

import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Replace 'multiply' with our new function.
  // It's an async operation, so it must return a Promise.
  checkInternetSpeed(
    testFileUrl: string,
    testFileSizeInBytes: number
  ): Promise<number>;
}

// The name 'NetSpeedChecker' is the link to the native side.
// We use getEnforcing because if the module isn't there, it's a critical error.
export default TurboModuleRegistry.getEnforcing<Spec>('NetSpeedChecker');