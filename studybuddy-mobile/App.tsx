import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/auth/AuthContext';
import { queryClient } from './src/api/queryClient';
import { ToastProvider } from './src/components/ui/ToastProvider';
import { ThemeProvider, useAppTheme } from './src/theme/ThemeProvider';

const ThemedStatusBar: React.FC = () => {
  const { mode } = useAppTheme();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ThemedStatusBar />
            <AppNavigator />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
