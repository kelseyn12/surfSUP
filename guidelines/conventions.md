# SurfSUP Coding Conventions

This document outlines the consistent layout, naming conventions, and coding style used in the SurfSUP application.

## Directory Structure

```
app/
├── src/
│   ├── components/        # Reusable UI components
│   ├── constants/         # App-wide constants (colors, routes, etc.)
│   ├── hooks/             # Custom React hooks
│   ├── navigation/        # Navigation configuration
│   ├── screens/           # Screen components
│   ├── services/          # API and other services
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript type definitions
├── assets/                # Static assets (images, fonts)
└── guidelines/            # Project documentation
```

## Component Conventions

### Reusable Components

All reusable components should be placed in `src/components/` and follow these conventions:

1. **File naming**: Use PascalCase for component files (e.g., `Button.tsx`, `HeaderBar.tsx`)
2. **Component structure**:
   - Import statements at the top
   - Interface definitions for props
   - Component function with JSDoc documentation
   - Styled components or StyleSheet at the bottom
   - Export statement at the end

3. **Example**:
```tsx
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

interface MyComponentProps {
  title: string;
  onPress?: () => void;
}

/**
 * Description of what this component does
 */
const MyComponent: React.FC<MyComponentProps> = ({ title, onPress }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // styles here
  },
  title: {
    // styles here
  },
});

export default MyComponent;
```

### Screen Components

Screen components should follow the same structure as reusable components, with additional considerations:

1. Place all screen components in `src/screens/`
2. Use the `HeaderBar` component for consistent headers
3. Implement the screen logic within the component rather than in external hooks where possible

## Navigation Patterns

1. **Navigation Types**: Use the defined types from `src/navigation/types.ts`
2. **Navigation Actions**:
   - Use `navigation.navigate()` for navigating to screens
   - Use `navigation.goBack()` for going back
   - Avoid complex navigation patterns with multiple fallbacks

## Styling Guidelines

1. **Colors**: Use the color constants from `src/constants/colors.ts`
2. **Spacing**: Use consistent spacing from the constants
3. **StyleSheet**: Define styles using StyleSheet.create() at the bottom of each component file
4. **Naming Conventions**:
   - Use camelCase for style properties
   - Use descriptive names that indicate purpose (e.g., `headerContainer` instead of `container1`)

## Code Quality Standards

1. **TypeScript**: Use proper TypeScript types for all components and functions
2. **Props**: Define all component props using interfaces
3. **Comments**: Use JSDoc style comments for component and function documentation
4. **Formatting**: Follow consistent indentation (2 spaces) and line breaks
5. **File Size**: Keep files under 300 lines of code; refactor larger files into smaller components

## Standard Components to Use

To maintain consistency across the app, use these standard components:

1. **HeaderBar**: For screen headers with back navigation
   ```tsx
   <HeaderBar 
     title="Screen Title" 
     showBackButton={true} 
     onBackPress={() => navigation.goBack()} 
   />
   ```

2. **Button**: For all button actions
   ```tsx
   <Button 
     title="Action" 
     onPress={handleAction} 
     variant="primary" 
     size="medium" 
   />
   ```

3. **SurfSpotCard**: For displaying surf spot information
   ```tsx
   <SurfSpotCard 
     spot={spotData} 
     onPress={() => navigateToSpotDetails(spotData.id)} 
   />
   ```

## State Management

1. **Local State**: Use React useState for component-level state
2. **Global State**: Use service modules with event emitters for shared state
3. **API Services**: All API calls should go through the services in `src/services/`

---

Following these conventions will ensure code consistency and maintainability across the SurfSUP application. 