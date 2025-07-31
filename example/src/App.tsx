// your-library-name/example/src/App.tsx

import * as React from 'react';
import { StyleSheet, View, Text, Alert, SafeAreaView } from 'react-native';

// Import your hook from the library's root.
// The Metro bundler is configured to resolve this correctly.
import { useInternetSpeedCheck } from 'react-native-net-speed-checker';

export default function App() {
  // This is the function we want to execute on low speed
  const handleLowSpeed = React.useCallback(() => {
    Alert.alert(
      'Slow Internet Connection',
      'Your internet speed has been below 25 kbps for 10 seconds.'
    );
  }, []);

  // Use your custom hook here!
  const { currentSpeedKbps, lowSpeedStreak } = useInternetSpeedCheck({
    onLowSpeed: handleLowSpeed,
    thresholdKbps: 500,
    durationSeconds: 10,
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Net Speed Checker Example</Text>

        <View style={styles.speedContainer}>
          <Text style={styles.speedText}>{Math.round(currentSpeedKbps)}</Text>
          <Text style={styles.speedUnit}>kbps</Text>
        </View>

        <Text style={styles.infoText}>Current Estimated Speed</Text>

        <View style={styles.separator} />

        <Text style={styles.infoText}>
          Low Speed Streak:{' '}
          <Text style={styles.bold}>{Math.floor(lowSpeedStreak)} / 10s</Text>
        </Text>

        <Text style={styles.statusText}>
          {lowSpeedStreak > 0
            ? 'Monitoring for persistent low speed...'
            : 'Connection speed looks good.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5FCFF',
  },
  card: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  speedContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  speedText: {
    fontSize: 64,
    fontWeight: '700',
    color: '#007AFF',
  },
  speedUnit: {
    fontSize: 24,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 8,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    width: '80%',
    marginVertical: 20,
  },
  bold: {
    fontWeight: 'bold',
  },
  statusText: {
    marginTop: 10,
    fontSize: 14,
    fontStyle: 'italic',
    color: '#888',
  },
});
