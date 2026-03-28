import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={16} color="#fff" style={styles.icon} />
      <Text style={styles.text}>No internet connection — some data may be outdated</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#c0392b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
});

export default OfflineBanner;
