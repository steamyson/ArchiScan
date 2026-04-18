import { config } from '@tamagui/config/v3';
import { createTamagui } from 'tamagui';

export const tamaguiConfig = createTamagui({
  ...config,
  themes: {
    ...config.themes,
    dark: {
      ...config.themes.dark,
      background: '#0a0a0a',
      backgroundStrong: '#111111',
      backgroundFocus: '#1a1a1a',
      color: '#f0ede8',
      colorMuted: '#888880',
      borderColor: '#2a2a2a',
    },
    light: {
      ...config.themes.light,
      background: '#f5f2ed',
      backgroundStrong: '#ffffff',
      backgroundFocus: '#ebe6df',
      color: '#1a1a1a',
      colorMuted: '#555550',
      borderColor: '#d4cfc6',
    },
  },
});

export default tamaguiConfig;
export type Conf = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
