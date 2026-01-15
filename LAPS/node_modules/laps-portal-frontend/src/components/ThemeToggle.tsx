import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { Button } from './ui/Button';

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative overflow-hidden"
      aria-label={theme === 'dark' ? 'Zu Light Mode wechseln' : 'Zu Dark Mode wechseln'}
    >
      <Sun
        className={`h-5 w-5 transition-all duration-300 ${
          theme === 'dark' ? 'rotate-90 scale-0' : 'rotate-0 scale-100'
        }`}
      />
      <Moon
        className={`absolute h-5 w-5 transition-all duration-300 ${
          theme === 'dark' ? 'rotate-0 scale-100' : '-rotate-90 scale-0'
        }`}
      />
    </Button>
  );
}
