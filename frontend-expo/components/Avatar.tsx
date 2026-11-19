import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type AvatarProps = { name: string; uri?: string | null; size?: number };

export default function Avatar({ name, uri, size = 50 }: AvatarProps) {
  const { theme } = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const initials = name.trim().split(/\s+/).filter(Boolean)
    .map(part => part[0].toUpperCase()).join('').slice(0, 2) || '?';

  return (
    <View accessibilityRole="image" accessibilityLabel={`${name}'s profile photo`}
      style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden',
        backgroundColor: theme.hintBubble, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.36, fontWeight: 'bold', color: theme.secondaryText }}>
        {initials}
      </Text>
      {uri && uri !== failedUri && (
        <Image key={uri} source={{ uri }} resizeMode="cover" style={StyleSheet.absoluteFill}
          onError={() => setFailedUri(uri)} />
      )}
    </View>
  );
}
