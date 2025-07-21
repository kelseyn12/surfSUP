import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const FirebaseTest = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Firebase integration temporarily disabled</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 10,
  },
  text: {
    fontSize: 16,
    color: '#333',
  },
}); 