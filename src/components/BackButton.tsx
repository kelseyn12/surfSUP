import React from 'react';
import { 
  TouchableOpacity, 
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

interface BackButtonProps {
  onPress: () => void;
  color?: string;
  size?: number;
}

/**
 * A simple back button component that can be used independently of any navigation system.
 * Requires an explicit onPress handler to handle the back navigation action.
 */
const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  color = COLORS.primary,
  size = 28,
}) => {
  return (
    <TouchableOpacity 
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Ionicons 
        name="arrow-back" 
        size={size} 
        color={color} 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
});

export default BackButton; 