import { useState, useEffect } from 'react';
import { Home, ArrowUp } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLocation } from 'react-router';

export function MobileHomeButton() {
  const [showButton, setShowButton] = useState(false);
  const { isDark } = useTheme();
  const location = useLocation();

  // Show button when user scrolls down
  useEffect(() => {
    const handleScroll = () => {
      // Show button when scrolled more than 300px
      setShowButton(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Only show on mobile/tablet screens
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  if (!isMobile || !showButton) return null;

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const isHomePage = location.pathname === '/';

  return (
    <button
      onClick={scrollToTop}
      className="fixed z-50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95"
      style={{
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        background: isDark 
          ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
          : 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
        border: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
      }}
      aria-label="Scroll to top"
      title="Back to top"
    >
      {isHomePage ? (
        <ArrowUp className="w-6 h-6" strokeWidth={2.5} />
      ) : (
        <Home className="w-6 h-6" strokeWidth={2.5} />
      )}
    </button>
  );
}
