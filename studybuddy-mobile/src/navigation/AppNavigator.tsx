import React, { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import OnboardingScreen from '../features/onboarding/OnboardingScreen';
import NotificationsScreen from '../features/notifications/NotificationsScreen';
import UpcomingEventsScreen from '../features/calendar/UpcomingEventsScreen';
import FeedScreen from '../features/feed/FeedScreen';
import { useAuth } from '../auth/AuthContext';
import { useAppTheme } from '../theme/ThemeProvider';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { status, user } = useAuth();
  const { colors, mode } = useAppTheme();

  const navigationTheme = useMemo(
    () => ({
      dark: mode === 'dark',
      colors: {
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.border,
        notification: colors.accent,
      },
      fonts: {
        regular: { fontFamily: 'System', fontWeight: 'normal' as const },
        medium: { fontFamily: 'System', fontWeight: '500' as const },
        bold: { fontFamily: 'System', fontWeight: 'bold' as const },
        heavy: { fontFamily: 'System', fontWeight: '900' as const },
      },
    }),
    [colors, mode]
  );

  // Check if user needs onboarding (non-admin users who haven't completed it)
  const needsOnboarding = useMemo(() => {
    if (!user) return false;
    // Only regular users need onboarding, admins/experts skip it
    const isRegularUser = user.role === 'USER';
    return isRegularUser && user.onboardingCompleted !== true;
  }, [user]);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {status === 'authenticated' ? (
          needsOnboarding ? (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          ) : (
            <>
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen 
                name="Notifications" 
                component={NotificationsScreen}
                options={{ 
                  presentation: 'modal',
                  headerShown: true,
                  headerTitle: 'Notifications',
                  headerStyle: { backgroundColor: colors.surface },
                  headerTintColor: colors.textPrimary,
                }}
              />
              <Stack.Screen 
                name="UpcomingEvents" 
                component={UpcomingEventsScreen}
                options={{ 
                  presentation: 'modal',
                  headerShown: true,
                  headerTitle: 'Upcoming Events',
                  headerStyle: { backgroundColor: colors.surface },
                  headerTintColor: colors.textPrimary,
                }}
              />
              <Stack.Screen 
                name="Feed" 
                component={FeedScreen}
                options={{ 
                  presentation: 'modal',
                  headerShown: true,
                  headerTitle: 'Activity Feed',
                  headerStyle: { backgroundColor: colors.surface },
                  headerTintColor: colors.textPrimary,
                }}
              />
            </>
          )
        ) : (
          <Stack.Screen name="AuthStack" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
