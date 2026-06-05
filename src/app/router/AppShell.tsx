import { Button } from '@ui/Button';
import type { PropsWithChildren } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/auth.store';
import { navRoutes } from './routeRegistry';

export function AppShell({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="app-brand" to="/">
          React Boilerplate
        </Link>
        <nav className="app-nav" aria-label="Primary navigation">
          {navRoutes.map((route) => (
            <Link key={route.path} to={route.path}>
              {route.title}
            </Link>
          ))}
          {user ? <Link to={`/users/${user.id}`}>Profile</Link> : <Link to="/login">Login</Link>}
          {user ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                logout();
                void navigate('/login');
              }}
            >
              Logout
            </Button>
          ) : null}
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
