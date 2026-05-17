import { BulbOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import useTheme from '../hooks/useTheme';

const ThemeToggle = () => {
  const { resolvedTheme, themePreference, setThemePreference, themeOptions, toggleTheme } =
    useTheme();

  return (
    <div className="theme-panel flex items-center gap-1 rounded-2xl p-1">
      <button
        type="button"
        onClick={toggleTheme}
        className="theme-toggle-btn relative inline-flex h-10 w-10 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
        title={`Current theme: ${resolvedTheme}`}
      >
        {resolvedTheme === 'dark' ? (
          <MoonOutlined className="text-sm" />
        ) : (
          <SunOutlined className="text-sm" />
        )}
      </button>

      <button
        type="button"
        onClick={() => setThemePreference(themeOptions.SYSTEM)}
        className={`theme-mode-pill inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
          themePreference === themeOptions.SYSTEM ? 'is-active' : ''
        } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary`}
        aria-pressed={themePreference === themeOptions.SYSTEM}
      >
        <BulbOutlined />
        <span className="hidden lg:inline">System</span>
      </button>
    </div>
  );
};

export default ThemeToggle;
