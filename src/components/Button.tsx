import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * A reusable button component with different variants and sizes
 * 
 * Usage example:
 * <Button 
 *   title="Submit" 
 *   onPress={handleSubmit} 
 *   variant="primary" 
 *   size="medium"
 *   icon="checkmark-circle"
 *   loading={isSubmitting}
 *   disabled={!isValid}
 * />
 */
const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  // Get styles based on variant
  const getVariantStyles = (): {
    container: StyleProp<ViewStyle>;
    text: StyleProp<TextStyle>;
    icon: string;
  } => {
    switch (variant) {
      case 'secondary':
        return {
          container: styles.secondaryContainer,
          text: styles.secondaryText,
          icon: COLORS.secondary,
        };
      case 'outline':
        return {
          container: styles.outlineContainer,
          text: styles.outlineText,
          icon: COLORS.primary,
        };
      case 'text':
        return {
          container: styles.textContainer,
          text: styles.textText,
          icon: COLORS.primary,
        };
      case 'primary':
      default:
        return {
          container: styles.primaryContainer,
          text: styles.primaryText,
          icon: COLORS.white,
        };
    }
  };

  // Get styles based on size
  const getSizeStyles = (): {
    container: StyleProp<ViewStyle>;
    text: StyleProp<TextStyle>;
    iconSize: number;
  } => {
    switch (size) {
      case 'small':
        return {
          container: styles.smallContainer,
          text: styles.smallText,
          iconSize: 16,
        };
      case 'large':
        return {
          container: styles.largeContainer,
          text: styles.largeText,
          iconSize: 24,
        };
      case 'medium':
      default:
        return {
          container: styles.mediumContainer,
          text: styles.mediumText,
          iconSize: 20,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  // Render the button content (text, icon, or loading indicator)
  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size={size === 'small' ? 'small' : 'large'}
          color={variant === 'primary' ? COLORS.white : COLORS.primary}
        />
      );
    }

    const iconElement = icon ? (
      <Ionicons
        name={icon}
        size={sizeStyles.iconSize}
        color={variantStyles.icon}
        style={[
          iconPosition === 'left' ? styles.iconLeft : styles.iconRight,
          disabled && styles.disabledIcon,
        ]}
      />
    ) : null;

    return (
      <View style={styles.contentContainer}>
        {icon && iconPosition === 'left' && iconElement}
        <Text
          style={[
            styles.text,
            variantStyles.text,
            sizeStyles.text,
            disabled && styles.disabledText,
            textStyle,
          ]}
        >
          {title}
        </Text>
        {icon && iconPosition === 'right' && iconElement}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        variantStyles.container,
        sizeStyles.container,
        fullWidth && styles.fullWidth,
        disabled && styles.disabledContainer,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  
  // Variant styles
  primaryContainer: {
    backgroundColor: COLORS.primary,
  },
  secondaryContainer: {
    backgroundColor: COLORS.secondary,
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  textContainer: {
    backgroundColor: 'transparent',
  },
  
  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryText: {
    color: COLORS.white,
  },
  secondaryText: {
    color: COLORS.white,
  },
  outlineText: {
    color: COLORS.primary,
  },
  textText: {
    color: COLORS.primary,
  },
  
  // Size styles
  smallContainer: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    minHeight: 32,
  },
  mediumContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 40,
  },
  largeContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 48,
  },
  
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
  
  // Icon styles
  iconLeft: {
    marginRight: SPACING.xs,
  },
  iconRight: {
    marginLeft: SPACING.xs,
  },
  
  // Disabled styles
  disabledContainer: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
  disabledIcon: {
    opacity: 0.7,
  },
});

export default Button;

// Example for Cancel button implementation if needed
export const CancelButton: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const handleCancel = () => {
    console.log('[CancelButton] Cancel button pressed');
    
    // Simple back navigation
    try {
      if (navigation && navigation.canGoBack()) {
        navigation.goBack();
      } else if (navigation) {
        navigation.navigate('Main');
      }
    } catch (error) {
      console.error('[CancelButton] Navigation error:', error);
      if (navigation) {
        navigation.navigate('Main');
      }
    }
  };

  return (
    <Button
      title="Cancel"
      onPress={handleCancel}
      variant="outline"
      size="large"
    />
  );
}; 