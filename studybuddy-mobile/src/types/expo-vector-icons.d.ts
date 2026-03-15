declare module '@expo/vector-icons' {
  import * as React from 'react';
  import { TextStyle, ViewStyle } from 'react-native';

  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: TextStyle | ViewStyle;
  }

  export type GlyphMap = Record<string, number>;

  export class Ionicons extends React.Component<IconProps> {
    static glyphMap: GlyphMap;
  }

  export class MaterialIcons extends React.Component<IconProps> {
    static glyphMap: GlyphMap;
  }

  export class MaterialCommunityIcons extends React.Component<IconProps> {
    static glyphMap: GlyphMap;
  }

  export class FontAwesome extends React.Component<IconProps> {
    static glyphMap: GlyphMap;
  }

  export class FontAwesome5 extends React.Component<IconProps> {
    static glyphMap: GlyphMap;
  }

  export class Feather extends React.Component<IconProps> {
    static glyphMap: GlyphMap;
  }

  export class AntDesign extends React.Component<IconProps> {
    static glyphMap: GlyphMap;
  }

  export class Entypo extends React.Component<IconProps> {
    static glyphMap: GlyphMap;
  }

  export class EvilIcons extends React.Component<IconProps> {
    static glyphMap: GlyphMap;
  }

  export class Foundation extends React.Component<IconProps> {
    static glyphMap: GlyphMap;
  }

  export class Octicons extends React.Component<IconProps> {
    static glyphMap: GlyphMap;
  }

  export class SimpleLineIcons extends React.Component<IconProps> {
    static glyphMap: GlyphMap;
  }

  export class Zocial extends React.Component<IconProps> {
    static glyphMap: GlyphMap;
  }
}
