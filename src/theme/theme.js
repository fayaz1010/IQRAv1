import { createTheme } from '@mui/material/styles';

const getTheme = (mode, fontSize = 'medium') => {
  // Common colors that adapt to theme mode
  const getColor = (lightColor, darkColor) => mode === 'light' ? lightColor : darkColor;

  // Font size multipliers
  const fontSizeMultipliers = {
    small: 0.875,
    medium: 1,
    large: 1.125
  };

  const multiplier = fontSizeMultipliers[fontSize];

  const baseFontSizes = {
    h1: 40,
    h2: 32,
    h3: 24,
    h4: 20,
    h5: 16,
    h6: 14,
    body1: 16,
    body2: 14,
    button: 14,
    caption: 12,
    overline: 12
  };

  // Apply multiplier to all font sizes
  const adjustedFontSizes = Object.keys(baseFontSizes).reduce((acc, key) => ({
    ...acc,
    [key]: {
      fontSize: `${baseFontSizes[key] * multiplier}px`
    }
  }), {});

  return createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'dark' ? '#2196f3' : '#1F4068',
        light: mode === 'dark' ? '#64b5f6' : '#345D98',
        dark: mode === 'dark' ? '#1976d2' : '#0D2137',
        contrastText: '#ffffff',
      },
      secondary: {
        main: mode === 'dark' ? '#f50057' : '#C99A3C',
        light: mode === 'dark' ? '#ff4081' : '#E3B456',
        dark: mode === 'dark' ? '#c51162' : '#A67B1F',
        contrastText: '#ffffff',
      },
      background: {
        default: mode === 'dark' ? '#121212' : '#F5F7FA',
        paper: mode === 'dark' ? '#1e1e1e' : '#FFFFFF',
        darker: mode === 'dark' ? '#0a0a0a' : '#e0e0e0',
      },
      text: {
        primary: mode === 'dark' ? '#ffffff' : '#2D3748',
        secondary: mode === 'dark' ? '#b0b0b0' : '#4A5568',
      },
      divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
    },
    components: {
      MuiLink: {
        styleOverrides: {
          root: {
            color: mode === 'dark' ? '#2196f3' : '#1F4068',
            '&:hover': {
              color: mode === 'dark' ? '#64b5f6' : '#345D98',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& label': {
              color: mode === 'dark' ? '#b0b0b0' : '#4A5568',
              fontSize: `${14 * multiplier}px`,
            },
            '& label.Mui-focused': {
              color: mode === 'dark' ? '#2196f3' : '#1F4068',
            },
            '& .MuiInputBase-input': {
              fontSize: `${16 * multiplier}px`,
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: 'none',
            fontSize: `${14 * multiplier}px`,
            '&:hover': {
              boxShadow: 'none',
            },
          },
          contained: {
            '&:hover': {
              boxShadow: 'none',
            },
          },
          outlined: {
            borderColor: mode === 'dark' ? '#2196f3' : '#1F4068',
            '&:hover': {
              borderColor: mode === 'dark' ? '#64b5f6' : '#345D98',
              backgroundColor: mode === 'dark' ? 'rgba(33, 150, 243, 0.08)' : 'rgba(31, 64, 104, 0.04)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: mode === 'dark' ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.18)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: mode === 'dark' ? '#1e1e1e' : '#FFFFFF',
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
          },
        },
      },
      MuiListItemText: {
        styleOverrides: {
          primary: {
            fontSize: `${16 * multiplier}px`,
          },
          secondary: {
            fontSize: `${14 * multiplier}px`,
          },
        },
      },
    },
    typography: {
      fontFamily: '"Roboto", "Arial", sans-serif',
      ...adjustedFontSizes,
      h1: {
        ...adjustedFontSizes.h1,
        fontWeight: 700,
        letterSpacing: '-0.01562em',
      },
      h2: {
        ...adjustedFontSizes.h2,
        fontWeight: 700,
        letterSpacing: '-0.00833em',
      },
      h3: {
        ...adjustedFontSizes.h3,
        fontWeight: 600,
        letterSpacing: '0em',
      },
      h4: {
        ...adjustedFontSizes.h4,
        fontWeight: 600,
        letterSpacing: '0.00735em',
      },
      h5: {
        ...adjustedFontSizes.h5,
        fontWeight: 600,
        letterSpacing: '0em',
      },
      h6: {
        ...adjustedFontSizes.h6,
        fontWeight: 600,
        letterSpacing: '0.0075em',
      },
      button: {
        ...adjustedFontSizes.button,
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 8,
    },
  });
};

export default getTheme;
