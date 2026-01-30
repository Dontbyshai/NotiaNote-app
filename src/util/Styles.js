import { loadAsync } from 'expo-font';
import { configureFonts, MD3LightTheme } from 'react-native-paper';

// Custom font configuration for Paper to prevent font loading errors
const fontConfig = {
  web: {
    regular: { fontFamily: 'Text-Regular', fontWeight: 'normal' },
    medium: { fontFamily: 'Text-Medium', fontWeight: 'normal' },
    light: { fontFamily: 'Text-Regular', fontWeight: 'normal' },
    thin: { fontFamily: 'Text-Regular', fontWeight: 'normal' },
  },
  ios: {
    regular: { fontFamily: 'Text-Regular', fontWeight: 'normal' },
    medium: { fontFamily: 'Text-Medium', fontWeight: 'normal' },
    light: { fontFamily: 'Text-Regular', fontWeight: 'normal' },
    thin: { fontFamily: 'Text-Regular', fontWeight: 'normal' },
  },
  android: {
    regular: { fontFamily: 'Text-Regular', fontWeight: 'normal' },
    medium: { fontFamily: 'Text-Medium', fontWeight: 'normal' },
    light: { fontFamily: 'Text-Regular', fontWeight: 'normal' },
    thin: { fontFamily: 'Text-Regular', fontWeight: 'normal' },
  },
};

// Themes
class Themes {
  static DarkTheme = {
    ...MD3LightTheme,
    fonts: configureFonts({ config: fontConfig }),
    dark: true,
    colors: {
      background: '#0F172A', // Galaxy darker
      onBackground: '#E7EDF2',
      backdrop: '#0E1116',
      surface: '#1E293B', // Slate 800
      surfaceOutline: '#334155', // Slate 700
      onSurface: '#E7EDF2',
      onSurfaceDisabled: '#94A3B8',
      primary: '#8B5CF6', // Default Violet
      primaryLight: '#2E1065',
      onPrimary: '#FFF',
      success: '#10B981',
      successLight: '#064E3B',
      error: '#EF4444',
      errorLight: '#450A0A',
    },
  };

  static LightTheme = {
    ...MD3LightTheme,
    fonts: configureFonts({ config: fontConfig }),
    dark: false,
    colors: {
      background: '#F5F7FA',
      onBackground: '#0F172A',
      backdrop: '#FFF',
      surface: '#FFFFFF',
      surfaceOutline: '#E2E8F0',
      onSurface: '#0F172A',
      onSurfaceDisabled: '#64748B',
      primary: '#8B5CF6',
      primaryLight: '#FFFFFF',
      onPrimary: '#FFF',
      success: '#10B981',
      successLight: '#D1FAE5',
      error: '#EF4444',
      errorLight: '#FEE2E2',
    },
  };

  // Nouveaux Thèmes
  static VioletCosmique = Themes.DarkTheme; // Default

  static BleuOcean = {
    ...Themes.DarkTheme,
    colors: { ...Themes.DarkTheme.colors, primary: '#3B82F6', primaryLight: '#172554' }
  };

  static VertEmeraude = {
    ...Themes.DarkTheme,
    colors: { ...Themes.DarkTheme.colors, primary: '#10B981', primaryLight: '#064E3B' }
  };

  static RoseAurore = {
    ...Themes.DarkTheme,
    colors: { ...Themes.DarkTheme.colors, primary: '#EC4899', primaryLight: '#831843' }
  };

  static OrangeSolaire = {
    ...Themes.DarkTheme,
    colors: { ...Themes.DarkTheme.colors, primary: '#F97316', primaryLight: '#7C2D12' }
  };

  static CyanNeon = {
    ...Themes.DarkTheme,
    colors: { ...Themes.DarkTheme.colors, primary: '#06B6D4', primaryLight: '#164E63' }
  };

  static NoirProfond = {
    ...Themes.DarkTheme,
    colors: {
      ...Themes.DarkTheme.colors,
      background: '#09090b', // Zinc 950 (Softer, premium black)
      surface: '#18181b',    // Zinc 900
      surfaceOutline: '#27272a', // Zinc 800
      primary: '#FAFAFA',    // Zinc 50 (Off-white)
      primaryLight: '#27272a', // Zinc 800 (for subtle gradient)
      onBackground: '#FAFAFA',
      onSurface: '#E4E4E7',  // Zinc 200
    }
  };

  static ClairModerne = Themes.LightTheme;
};


// Load all fonts used in the app
const useFonts = async () => await loadAsync({
  'Text-Regular': require('../../assets/fonts/Poppins-Regular.ttf'),
  'Text-Medium': require('../../assets/fonts/Poppins-Medium.ttf'),
  'Text-Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
  'Text-Italic': require('../../assets/fonts/Poppins-MediumItalic.ttf'),

  'MainTitle': require('../../assets/fonts/Playball-Regular.ttf'),

  'Numbers-Regular': require('../../assets/fonts/Rubik-Regular.ttf'),
  'Numbers-Medium': require('../../assets/fonts/Rubik-Medium.ttf'),
  'Numbers-Bold': require('../../assets/fonts/Rubik-Bold.ttf'),
});

// Set all fonts in app
function initThemeFonts(theme) {
  theme.fonts = {
    titleLarge: {
      fontSize: 35.0,
      fontFamily: 'Text-Medium',
      color: theme.colors.onBackground,
    },
    titleMedium: {
      fontSize: 25.0,
      fontFamily: 'Text-Medium',
      color: theme.colors.onBackground,
    },
    titleSmall: {
      fontSize: 20.0,
      fontFamily: 'Text-Medium',
      color: theme.colors.onBackground,
    },

    headlineLarge: {
      fontSize: 35.0,
      fontFamily: 'Numbers-Bold',
      color: theme.colors.onBackground,
    },
    headlineMedium: {
      fontSize: 20.0,
      fontFamily: 'Numbers-Medium',
      color: theme.colors.onBackground,
    },
    headlineSmall: {
      fontSize: 12.0,
      fontFamily: 'Numbers-Medium',
      color: theme.colors.onBackground,
    },

    bodyLarge: {
      fontSize: 17.0,
      fontWeight: 'normal',
      fontFamily: 'Text-Medium',
      color: theme.colors.onSurface,
    },
    bodyMedium: {
      fontSize: 15.0,
      fontWeight: 'normal',
      fontFamily: 'Text-Medium',
      color: theme.colors.onSurface,
    },
    bodySmall: {
      fontSize: 13.0,
      fontWeight: 'normal',
      fontFamily: 'Text-Medium',
      color: theme.colors.onSurface,
    },

    labelLarge: {
      fontSize: 17.0,
      fontWeight: 'normal',
      fontFamily: 'Text-Regular',
      color: theme.colors.onSurfaceDisabled,
    },
    labelMedium: {
      fontSize: 15.0,
      fontWeight: 'normal',
      fontFamily: 'Text-Regular',
      color: theme.colors.onSurfaceDisabled,
    },
    labelSmall: {
      fontSize: 13.0,
      fontWeight: 'normal',
      fontFamily: 'Text-Regular',
      color: theme.colors.onSurfaceDisabled,
    },
  }
}

// Main load function
async function initFontsAndThemes() {
  await useFonts();

  // Initialize fonts for all defined themes
  initThemeFonts(Themes.DarkTheme);
  initThemeFonts(Themes.LightTheme);

  // Ensure derivative themes also get fonts (since they were spread-copied before fonts were added)
  initThemeFonts(Themes.BleuOcean);
  initThemeFonts(Themes.VertEmeraude);
  initThemeFonts(Themes.RoseAurore);
  initThemeFonts(Themes.OrangeSolaire);
  initThemeFonts(Themes.CyanNeon);
  initThemeFonts(Themes.NoirProfond);
  // ClairModerne references LightTheme, so it's covered if it's a direct reference. 
  // But strictly, initialized definition says: static ClairModerne = Themes.LightTheme;
  // So initThemeFonts(Themes.LightTheme) covers it.
  // VioletCosmique references DarkTheme, so it's covered.
}

export { initFontsAndThemes, Themes };