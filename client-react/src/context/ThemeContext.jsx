import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';

const THEME_STORAGE_KEY = 'epr-kavach-theme';
const THEME_OPTIONS = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
};

const themePalettes = {
  light: {
    colorBgBase: '#f7f8fc',
    colorBgLayout: '#f4f6fb',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorTextBase: '#111827',
    colorTextSecondary: '#6b7280',
    colorBorder: '#e5e7eb',
    colorPrimary: '#ea580c',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    boxShadow: '0 18px 44px rgba(15, 23, 42, 0.08)',
  },
  dark: {
    colorBgBase: '#0f172a',
    colorBgLayout: '#020617',
    colorBgContainer: '#111827',
    colorBgElevated: '#172033',
    colorTextBase: '#f8fafc',
    colorTextSecondary: '#94a3b8',
    colorBorder: '#233044',
    colorPrimary: '#fb923c',
    colorSuccess: '#34d399',
    colorWarning: '#fbbf24',
    colorError: '#f87171',
    boxShadow: '0 22px 54px rgba(2, 6, 23, 0.45)',
  },
};

export const ThemeContext = createContext({
  themePreference: THEME_OPTIONS.SYSTEM,
  resolvedTheme: THEME_OPTIONS.LIGHT,
  isDark: false,
  setThemePreference: () => {},
  toggleTheme: () => {},
  antTheme: {},
});

const getSystemTheme = () => {
  if (typeof window === 'undefined') return THEME_OPTIONS.LIGHT;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? THEME_OPTIONS.DARK
    : THEME_OPTIONS.LIGHT;
};

const getStoredThemePreference = () => {
  if (typeof window === 'undefined') return THEME_OPTIONS.SYSTEM;
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return Object.values(THEME_OPTIONS).includes(storedTheme)
    ? storedTheme
    : THEME_OPTIONS.SYSTEM;
};

export const ThemeProvider = ({ children }) => {
  const [themePreference, setThemePreferenceState] = useState(getStoredThemePreference);
  const [resolvedTheme, setResolvedTheme] = useState(() =>
    getStoredThemePreference() === THEME_OPTIONS.SYSTEM
      ? getSystemTheme()
      : getStoredThemePreference(),
  );
  const overlayRef = useRef(null);

  const applyTheme = useCallback((nextPreference) => {
    const nextResolvedTheme =
      nextPreference === THEME_OPTIONS.SYSTEM ? getSystemTheme() : nextPreference;

    setThemePreferenceState(nextPreference);
    setResolvedTheme(nextResolvedTheme);

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
      } catch (error) {
        console.warn('Failed to save theme preference:', error);
      }
      document.documentElement.dataset.theme = nextResolvedTheme;
      document.documentElement.style.colorScheme = nextResolvedTheme;
      document.body.dataset.theme = nextResolvedTheme;
    }
  }, []);

  useEffect(() => {
    applyTheme(themePreference);
  }, [applyTheme, themePreference]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (themePreference === THEME_OPTIONS.SYSTEM) {
        applyTheme(THEME_OPTIONS.SYSTEM);
      }
    };

    media.addEventListener('change', handleChange);

    return () => {
      media.removeEventListener('change', handleChange);
    };
  }, [applyTheme, themePreference]);

  const animateThemeSwitch = useCallback(() => {
    if (!overlayRef.current || typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    gsap.killTweensOf(overlayRef.current);
    gsap.fromTo(
      overlayRef.current,
      { autoAlpha: 0, scale: 0.985 },
      {
        autoAlpha: 0.14,
        scale: 1,
        duration: 0.18,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
      },
    );
  }, []);

  const setThemePreference = useCallback(
    (nextPreference) => {
      applyTheme(nextPreference);
      animateThemeSwitch();
    },
    [animateThemeSwitch, applyTheme],
  );

  const toggleTheme = useCallback(() => {
    const nextPreference =
      resolvedTheme === THEME_OPTIONS.DARK ? THEME_OPTIONS.LIGHT : THEME_OPTIONS.DARK;
    setThemePreference(nextPreference);
  }, [resolvedTheme, setThemePreference]);

  const antTheme = useMemo(() => {
    const palette = themePalettes[resolvedTheme];

    return {
      token: {
        colorPrimary: palette.colorPrimary,
        colorSuccess: palette.colorSuccess,
        colorWarning: palette.colorWarning,
        colorError: palette.colorError,
        colorTextBase: palette.colorTextBase,
        colorText: palette.colorTextBase,
        colorTextSecondary: palette.colorTextSecondary,
        colorBorder: palette.colorBorder,
        colorBgBase: palette.colorBgBase,
        colorBgLayout: palette.colorBgLayout,
        colorBgContainer: palette.colorBgContainer,
        colorBgElevated: palette.colorBgElevated,
        borderRadius: 12,
        borderRadiusLG: 16,
        fontFamily: 'Nunito, sans-serif',
        boxShadowSecondary: palette.boxShadow,
      },
      components: {
        Layout: {
          bodyBg: palette.colorBgLayout,
          siderBg: palette.colorBgElevated,
          headerBg: palette.colorBgContainer,
        },
        Menu: {
          itemBorderRadius: 10,
        },
        Table: {
          headerBg: resolvedTheme === 'dark' ? '#1e293b' : '#fff7ed',
          headerColor: palette.colorTextBase,
          rowHoverBg: resolvedTheme === 'dark' ? '#172033' : '#fffaf5',
          borderColor: palette.colorBorder,
        },
        Card: {
          colorBgContainer: palette.colorBgContainer,
        },
        Modal: {
          contentBg: palette.colorBgContainer,
          headerBg: palette.colorBgContainer,
        },
      },
    };
  }, [resolvedTheme]);

  const value = useMemo(
    () => ({
      themePreference,
      resolvedTheme,
      isDark: resolvedTheme === THEME_OPTIONS.DARK,
      setThemePreference,
      toggleTheme,
      antTheme,
      themeOptions: THEME_OPTIONS,
    }),
    [antTheme, resolvedTheme, setThemePreference, themePreference, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <div className="theme-transition-overlay" ref={overlayRef} aria-hidden="true" />
      {children}
    </ThemeContext.Provider>
  );
};
