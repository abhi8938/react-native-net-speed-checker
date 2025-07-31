# React Native Net Speed Checker

A simple, lightweight React Native hook to monitor internet connection speed and trigger callbacks on persistently low speeds. Uses native modules for efficient performance on both iOS and Android.

## Installation

```sh
npm install react-native-net-speed-checker
# or
yarn add react-native-net-speed-checker
```

After installing, make sure to rebuild your app:
```sh
# For iOS
npx pod-install

# For Android
# The package will be autolinked.

# Rebuild your app
npx react-native run-android
npx react-native run-ios
```

## Usage

Import the `useInternetSpeedCheck` hook in your component.

```javascript
import React, { useCallback } from 'react';
import { SafeAreaView, Text, Alert } from 'react-native';
import { useInternetSpeedCheck } from 'react-native-net-speed-checker';

const App = () => {
  const handleLowSpeed = useCallback(() => {
    Alert.alert(
      "Slow Connection",
      "Your internet has been slow for 10 seconds."
    );
  }, []);

  const { currentSpeedKbps } = useInternetSpeedCheck({
    onLowSpeed: handleLowSpeed,
    thresholdKbps: 25, // Default: 25
    durationSeconds: 10, // Default: 10
  });

  return (
    <SafeAreaView>
      <Text>Current Speed: {currentSpeedKbps} kbps</Text>
    </SafeAreaView>
  );
};

export default App;
```

## API

### `useInternetSpeedCheck(options)`

**Options:**

| Prop              | Type         | Default | Description                                                        |
| ----------------- | ------------ | ------- | ------------------------------------------------------------------ |
| `onLowSpeed`      | `() => void` | **-**   | **Required**. The callback function to execute when the threshold is met. |
| `thresholdKbps`   | `number`     | `25`    | The speed limit in kbps. If the speed is below this, it's considered low. |
| `durationSeconds` | `number`     | `10`    | The consecutive duration in seconds for which the speed must be low. |

**Returns:**

An object containing:
*   `currentSpeedKbps` (number): The last measured internet speed in kilobits per second.
*   `lowSpeedStreak` (number): The current number of consecutive seconds the speed has been low.