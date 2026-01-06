import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../features/auth/screens/LoginScreen';
import RegisterScreen from '../features/auth/screens/RegisterScreen';
import GoogleOAuthScreen from '../features/auth/screens/GoogleOAuthScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  GoogleOAuth: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="GoogleOAuth" component={GoogleOAuthScreen} />
    </Stack.Navigator>
  );
};

export default AuthStack;
