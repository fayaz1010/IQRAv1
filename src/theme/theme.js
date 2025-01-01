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
        main: getColor('#1F4068', '#4A90E2'),  // Lighter blue in dark mode
        light: getColor('#345D98', '#68A6E8'),
        dark: getColor('#0D2137', '#2171C7'),
        contrastText: '#ffffff',
      },
      secondary: {
        main: getColor('#C99A3C', '#F7B733'),  // Brighter gold in dark mode
        light: getColor('#E3B456', '#F9C65B'),
        dark: getColor('#A67B1F', '#D99B1C'),
        contrastText: '#ffffff',
      },
      background: {
        default: getColor('#F5F7FA', '#121212'),
        paper: getColor('#FFFFFF', '#1E1E1E'),
      },
      text: {
        primary: getColor('#2D3748', '#E0E0E0'),
        secondary: getColor('#4A5568', '#A0A0A0'),
      },
      divider: getColor('rgba(0, 0, 0, 0.12)', 'rgba(255, 255, 255, 0.12)'),
    },
    components: {
      MuiLink: {
        styleOverrides: {
          root: {
            color: getColor('#1F4068', '#4A90E2'),
            '&:hover': {
              color: getColor('#345D98', '#68A6E8'),
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& label': {
              color: getColor('#4A5568', '#A0A0A0'),
              fontSize: `${14 * multiplier}px`,
            },
            '& label.Mui-focused': {
              color: getColor('#1F4068', '#4A90E2'),
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
            borderColor: getColor('#1F4068', '#4A90E2'),
            '&:hover': {
              borderColor: getColor('#345D98', '#68A6E8'),
              backgroundColor: getColor('rgba(31, 64, 104, 0.04)', 'rgba(74, 144, 226, 0.08)'),
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: getColor(
              '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.18)'
            ),
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: getColor('rgba(0, 0, 0, 0.12)', 'rgba(255, 255, 255, 0.12)'),
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
