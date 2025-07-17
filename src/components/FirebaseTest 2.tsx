import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
// import { auth } from '../config/firebase';

export const FirebaseTest = () => {
  // const [status, setStatus] = useState<string>('Testing connection...');

  // useEffect(() => {
  //   const testConnection = async () => {
  //     try {
  //       // Wait for auth to be ready
  //       await new Promise(resolve => setTimeout(resolve, 1000));
      
  //       if (!auth) {
  //         throw new Error('Firebase auth not initialized');
  //       }
      
  //       setStatus('Firebase connection successful!');
  //     } catch (error) {
  //       setStatus(`Firebase connection failed: ${error.message}`);
  //       console.error('Firebase test error:', error);
  //     }
  //   };

  //   testConnection();
  // }, []);

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