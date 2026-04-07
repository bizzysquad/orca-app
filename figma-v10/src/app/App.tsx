import { useState } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Login } from './pages/Login';
import { AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import type { User } from './context/AuthContext';

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  if (!user) {
    return <ThemeProvider><Login onLogin={setUser} /></ThemeProvider>;
  }

  return (
    <ThemeProvider>
      <AuthContext.Provider value={{ user, logout: () => setUser(null) }}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </ThemeProvider>
  );
}
