import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Platform, 
  StatusBar 
} from 'react-native';
import { COLORS } from '../constants/colors';
import BackButton from './BackButton';

interface HeaderBarProps {
  title: string;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
}

/**
 * A standardized header component for screens with optional back button
 */
const HeaderBar: React.FC<HeaderBarProps> = ({ 
  title, 
  onBackPress, 
  rightComponent 
}) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.header}>
        {onBackPress ? (
          <BackButton onPress={onBackPress} />
        ) : (
          <View style={styles.placeholderButton} />
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View style={styles.rightComponentContainer}>
          {rightComponent || <View style={styles.placeholderButton} />}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight || 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  placeholderButton: {
    width: 44,
    height: 44,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginRight: 8,
  },
  rightComponentContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HeaderBar;