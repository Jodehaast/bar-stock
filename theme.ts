import { extendTheme, type ThemeConfig } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
}

const theme = extendTheme({
  config,
  colors: {
    brand: {
      50:  '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#ffc107',
      500: '#e6ac00',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    app: {
      bg:          '#0d0f14',
      canvas:      '#111318',
      surface:     '#181b23',
      overlay:     '#1e2230',
      hover:       '#232839',
      sidebar:     '#0f1117',
      sidebarHover:'#181b23',
      border:      '#252a38',
      borderStrong:'#343a50',
      textPrimary: '#f0f2f8',
      textSecondary:'#8b95b0',
      textMuted:   '#4e5570',
    },
  },
  fonts: {
    heading: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    body:    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono:    '"Fira Code", "Fira Mono", monospace',
  },
  fontSizes: {
    xs: '0.72rem',
    sm: '0.85rem',
    md: '0.95rem',
  },
  radii: {
    sm:  '6px',
    md:  '8px',
    lg:  '10px',
    xl:  '14px',
    '2xl': '18px',
  },
  shadows: {
    card: '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
    glow: '0 0 40px rgba(255,193,7,0.12)',
  },
  styles: {
    global: {
      'html': { scrollBehavior: 'smooth' },
      'body': {
        bg: 'app.bg',
        color: 'app.textPrimary',
        fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
      },
      '::-webkit-scrollbar': { width: '6px', height: '6px' },
      '::-webkit-scrollbar-track': { bg: 'app.bg' },
      '::-webkit-scrollbar-thumb': { bg: 'app.border', borderRadius: '3px' },
      '::-webkit-scrollbar-thumb:hover': { bg: 'app.borderStrong' },
    },
  },
  components: {
    Button: {
      defaultProps: { colorScheme: 'brand' },
      baseStyle: {
        fontWeight: '600',
        borderRadius: 'lg',
        _focus: { boxShadow: 'none' },
      },
      variants: {
        solid: (props: any) => ({
          ...(props.colorScheme === 'brand' && {
            bg: 'brand.400',
            color: 'gray.900',
            _hover: { bg: 'brand.500' },
            _active: { bg: 'brand.600' },
          }),
        }),
        ghost: {
          color: 'app.textSecondary',
          _hover: { bg: 'app.hover', color: 'app.textPrimary' },
        },
        outline: {
          borderColor: 'app.border',
          color: 'app.textSecondary',
          _hover: { bg: 'app.hover', borderColor: 'app.borderStrong', color: 'app.textPrimary' },
        },
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            bg: 'app.surface',
            borderColor: 'app.border',
            color: 'app.textPrimary',
            _placeholder: { color: 'app.textMuted' },
            _hover: { borderColor: 'app.borderStrong' },
            _focus: {
              borderColor: 'brand.400',
              boxShadow: '0 0 0 1px #ffc107',
              bg: 'app.overlay',
            },
            borderRadius: 'lg',
          },
        },
      },
      defaultProps: { variant: 'outline' },
    },
    Textarea: {
      variants: {
        outline: {
          bg: 'app.surface',
          borderColor: 'app.border',
          color: 'app.textPrimary',
          _placeholder: { color: 'app.textMuted' },
          _hover: { borderColor: 'app.borderStrong' },
          _focus: {
            borderColor: 'brand.400',
            boxShadow: '0 0 0 1px #ffc107',
            bg: 'app.overlay',
          },
          borderRadius: 'lg',
        },
      },
      defaultProps: { variant: 'outline' },
    },
    Select: {
      variants: {
        outline: {
          field: {
            bg: 'app.surface',
            borderColor: 'app.border',
            color: 'app.textPrimary',
            _hover: { borderColor: 'app.borderStrong' },
            _focus: { borderColor: 'brand.400', boxShadow: '0 0 0 1px #ffc107' },
            borderRadius: 'lg',
          },
          icon: { color: 'app.textSecondary' },
        },
      },
      defaultProps: { variant: 'outline' },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'app.surface',
          borderRadius: 'xl',
          border: '1px solid',
          borderColor: 'app.border',
          boxShadow: 'none',
        },
      },
    },
    Modal: {
      baseStyle: {
        overlay: { bg: 'rgba(0,0,0,0.7)' },
        dialog: {
          bg: 'app.overlay',
          borderRadius: '2xl',
          border: '1px solid',
          borderColor: 'app.border',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        },
        header: { color: 'app.textPrimary', fontWeight: '700', fontSize: 'lg' },
        closeButton: { color: 'app.textSecondary', _hover: { bg: 'app.hover' } },
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: 'full',
        fontWeight: '600',
        fontSize: 'xs',
        px: 2.5,
        py: 0.5,
        textTransform: 'none',
        letterSpacing: '0',
      },
    },
    Tooltip: {
      baseStyle: {
        bg: 'app.overlay',
        color: 'app.textPrimary',
        borderRadius: 'md',
        border: '1px solid',
        borderColor: 'app.border',
        fontSize: 'xs',
        px: 2.5,
        py: 1.5,
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      },
    },
    Divider: {
      baseStyle: { borderColor: 'app.border', opacity: 1 },
    },
    Menu: {
      baseStyle: {
        list: {
          bg: 'app.overlay',
          borderColor: 'app.border',
          borderRadius: 'xl',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          py: 1,
        },
        item: {
          bg: 'transparent',
          color: 'app.textSecondary',
          fontSize: 'sm',
          _hover: { bg: 'app.hover', color: 'app.textPrimary' },
          _focus: { bg: 'app.hover' },
        },
      },
    },
    FormLabel: {
      baseStyle: {
        color: 'app.textSecondary',
        fontSize: 'sm',
        fontWeight: '500',
        mb: 1.5,
      },
    },
    Heading: {
      baseStyle: { color: 'app.textPrimary', fontWeight: '700' },
    },
    Table: {
      variants: {
        simple: {
          th: {
            color: 'app.textMuted',
            borderColor: 'app.border',
            fontSize: 'xs',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 'wider',
          },
          td: { borderColor: 'app.border', color: 'app.textSecondary', fontSize: 'sm' },
        },
      },
    },
  },
})

export default theme
