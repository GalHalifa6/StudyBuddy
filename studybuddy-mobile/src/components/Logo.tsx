import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  dark?: boolean;
}

const SIZES = {
  sm: { icon: 24, container: 40, fontSize: 18 },
  md: { icon: 32, container: 56, fontSize: 24 },
  lg: { icon: 48, container: 80, fontSize: 32 },
  xl: { icon: 64, container: 100, fontSize: 40 },
};

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  showText = true,
  dark = false,
}) => {
  const { icon, container, fontSize } = SIZES[size];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#A855F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.iconContainer,
          { width: container, height: container, borderRadius: container / 4 },
        ]}
      >
        <Ionicons name="book" size={icon} color="#fff" />
        <View style={[styles.sparkle, { top: -4, right: -4 }]}>
          <Ionicons name="sparkles" size={icon / 3} color="#FCD34D" />
        </View>
      </LinearGradient>
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.logoText, { fontSize }, dark && styles.logoTextDark]}>
            Study<Text style={styles.logoTextAccent}>Buddy</Text>
          </Text>
          <Text style={[styles.tagline, { fontSize: fontSize / 3 }, dark && styles.taglineDark]}>
            Learn together, grow together
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  sparkle: {
    position: 'absolute',
  },
  textContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontWeight: '800',
    color: '#1F2937',
  },
  logoTextDark: {
    color: '#F9FAFB',
  },
  logoTextAccent: {
    color: '#6366F1',
  },
  tagline: {
    color: '#6B7280',
    marginTop: 4,
  },
  taglineDark: {
    color: '#9CA3AF',
  },
});

export default Logo;
