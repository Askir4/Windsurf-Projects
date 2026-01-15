import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LogOut, User, ClipboardList, FileText, 
  Home, Palette 
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui/Button';
import { Logo } from './Logo';

const navItems = [
  { path: '/', label: 'Anfrage', icon: Home, adminOnly: false },
  { path: '/admin', label: 'Queue', icon: ClipboardList, adminOnly: true },
  { path: '/audit', label: 'Audit', icon: FileText, adminOnly: true },
  { path: '/settings', label: 'Settings', icon: Palette, adminOnly: true },
];

export function Layout() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || (isAuthenticated && user?.isAdmin)
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 font-semibold">
              <Logo size={32} />
              <span className="text-sm font-bold hidden sm:block">LAPS Portal</span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {visibleNavItems.map((item) => (
                <Link key={item.path} to={item.path}>
                  <button
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                </Link>
              ))}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              <ThemeToggle />
              
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{user?.displayName}</span>
                    {user?.isAdmin && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary uppercase">
                        Admin
                      </span>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleLogout}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Link to="/login">
                  <Button size="sm">Admin Login</Button>
                </Link>
              )}

            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-muted-foreground">
            LAPS Portal • Sichere Verwaltung lokaler Admin-Passwörter
          </p>
        </div>
      </footer>
    </div>
  );
}
