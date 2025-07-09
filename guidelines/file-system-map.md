# File System Map

This document provides an up-to-date diagram of the project's file structure. It will be updated whenever new files or directories are added, modified, or removed.

## Current Structure

```
/app/
├── guidelines/                   # Project documentation and guidelines
│   ├── conventions.md            # Coding conventions and style guide
│   ├── file-system-map.md        # This file - project structure documentation
│   ├── refactoring-log.md        # Record of refactoring efforts
│   ├── glossary.md               # Glossary of methods and functions
│   └── todo.md                   # Project to-do list and tasks
│
├── src/                          # Source code
│   ├── assets/                   # Static assets
│   │   ├── icons/                # Icon files
│   │   │   └── .gitkeep
│   │   └── images/               # Image files
│   │       └── .gitkeep
│   │
│   ├── components/               # Reusable UI components
│   │   └── .gitkeep
│   │
│   ├── constants/                # Application constants
│   │   ├── index.ts              # Main constants export (colors, spacing, etc.)
│   │   └── mockData.ts           # Mock data for development and testing
│   │
│   ├── hooks/                    # Custom React hooks
│   │   └── .gitkeep
│   │
│   ├── navigation/               # Navigation configuration
│   │   └── .gitkeep
│   │
│   ├── screens/                  # Application screens
│   │   └── .gitkeep
│   │
│   ├── services/                 # API services and data fetching
│   │   └── .gitkeep
│   │
│   ├── store/                    # State management
│   │   └── .gitkeep
│   │
│   ├── types/                    # TypeScript types and interfaces
│   │   └── index.ts              # Data model interfaces
│   │
│   └── utils/                    # Utility functions
│       ├── conditionCalculators.ts  # Surf condition calculation utilities
│       ├── formatters.ts         # Data formatting utilities
│       ├── index.ts              # Utility function exports
│       ├── location.ts           # Location and mapping utilities
│       └── storage.ts            # Local storage utilities
│
├── .gitignore                    # Git ignore file
├── App.tsx                       # Main application component
├── app.json                      # Expo configuration
├── babel.config.js               # Babel configuration
├── package.json                  # Project dependencies
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # Project overview and instructions
```

## File Descriptions

### Core Files

- **App.tsx**: Main application component and entry point
- **app.json**: Expo configuration settings
- **package.json**: Project dependencies and scripts
- **tsconfig.json**: TypeScript configuration

### Source Code

#### Constants

- **constants/index.ts**: Contains application-wide constants like colors, spacing, and configuration settings
- **constants/mockData.ts**: Mock data used during development and testing

#### Types

- **types/index.ts**: TypeScript interfaces for data models like User, SurfSpot, SurfConditions, etc.

#### Utilities

- **utils/conditionCalculators.ts**: Functions for calculating surf condition ratings
- **utils/formatters.ts**: Functions for formatting data (wave heights, dates, etc.)
- **utils/location.ts**: Functions for location calculations and distance
- **utils/storage.ts**: Functions for local storage operations
- **utils/index.ts**: Barrel file exporting all utility functions

### Guidelines

- **guidelines/conventions.md**: Coding conventions and style guide
- **guidelines/file-system-map.md**: Project structure documentation
- **guidelines/refactoring-log.md**: History of refactoring efforts
- **guidelines/glossary.md**: Glossary of methods and functions
- **guidelines/todo.md**: Project tasks and to-do list

## Empty Directories (To Be Populated)

- **assets/icons/**: Will contain icon files for the application
- **assets/images/**: Will contain image files for the application
- **components/**: Will contain reusable UI components
- **hooks/**: Will contain custom React hooks
- **navigation/**: Will contain navigation configuration
- **screens/**: Will contain application screens
- **services/**: Will contain API service functions
- **store/**: Will contain state management logic 