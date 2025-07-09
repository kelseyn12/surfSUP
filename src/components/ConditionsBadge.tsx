import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants';

export type ConditionQuality = 'poor' | 'fair' | 'good' | 'excellent';

interface ConditionsBadgeProps {
  quality: ConditionQuality;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  label?: string;
  showText?: boolean;
}

/**
 * A reusable component for displaying surf condition quality
 */
const ConditionsBadge: React.FC<ConditionsBadgeProps> = ({
  quality,
  size = 'medium',
  showIcon = true,
  label,
  showText = true,
}) => {
  // Define colors based on condition quality
  const getColor = (): string => {
    switch (quality) {
      case 'excellent':
        return COLORS.surfConditions.excellent;
      case 'good':
        return COLORS.surfConditions.good;
      case 'fair':
        return COLORS.surfConditions.fair;
      case 'poor':
        return COLORS.surfConditions.poor;
      default:
        return COLORS.gray;
    }
  };

  // Define icon based on condition quality
  const getIcon = (): string => {
    switch (quality) {
      case 'excellent':
        return 'thumbs-up';
      case 'good':
        return 'happy';
      case 'fair':
        return 'remove';
      case 'poor':
        return 'thumbs-down';
      default:
        return 'help-circle';
    }
  };

  // Define size dimensions
  const getDimensions = () => {
    switch (size) {
      case 'small':
        return {
          badgeSize: 16,
          iconSize: 10,
          fontSize: 10,
          paddingHorizontal: SPACING.xs,
          paddingVertical: SPACING.xs / 2,
        };
      case 'large':
        return {
          badgeSize: 32,
          iconSize: 18,
          fontSize: 14,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.sm,
        };
      case 'medium':
      default:
        return {
          badgeSize: 24,
          iconSize: 14,
          fontSize: 12,
          paddingHorizontal: SPACING.sm,
          paddingVertical: SPACING.xs,
        };
    }
  };

  const { badgeSize, iconSize, fontSize, paddingHorizontal, paddingVertical } = getDimensions();
  const color = getColor();
  const icon = getIcon();

  // Define text label based on quality if not provided
  const getLabel = (): string => {
    if (label) return label;
    
    switch (quality) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'fair':
        return 'Fair';
      case 'poor':
        return 'Poor';
      default:
        return 'Unknown';
    }
  };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color,
          paddingHorizontal,
          paddingVertical,
          height: showText ? undefined : badgeSize,
          width: showText ? undefined : badgeSize,
          borderRadius: showText ? 4 : badgeSize / 2,
        },
      ]}
    >
      {showIcon && (
        <Ionicons
          name={icon}
          size={iconSize}
          color={COLORS.white}
          style={showText ? styles.iconWithText : undefined}
        />
      )}
      
      {showText && (
        <Text style={[styles.text, { fontSize }]}>
          {getLabel()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWithText: {
    marginRight: 4,
  },
  text: {
    color: COLORS.white,
    fontWeight: '500',
  },
});

export default ConditionsBadge; 