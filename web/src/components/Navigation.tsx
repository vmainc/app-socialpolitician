import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LOGO_BASE64, LOGO_ALT } from '../assets/logo-base64';
import './Navigation.css';

export default function Navigation() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="main-navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo" onClick={closeMenu}>
          <img 
            src={LOGO_BASE64} 
            alt={LOGO_ALT}
            className="logo-image"
          />
        </Link>
        
        {/* Hamburger button for mobile - 44px min touch target */}
        <button 
          className="nav-hamburger"
          onClick={toggleMenu}
          onTouchEnd={(e) => e.currentTarget.blur()}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
          type="button"
        >
          <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
        </button>

        {/* Backdrop when menu is open - tap to close, improves touch behavior */}
        {isMenuOpen && (
          <div
            className="nav-backdrop"
            aria-hidden
            onClick={closeMenu}
            onTouchEnd={(e) => { e.preventDefault(); closeMenu(); }}
          />
        )}
        
        {/* Navigation links - hidden on mobile, shown in dropdown when menu is open */}
        <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
          <Link 
            to="/" 
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Home
          </Link>
          <Link 
            to="/senators" 
            className={`nav-link ${isActive('/senators') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Senators
          </Link>
          <Link 
            to="/representatives" 
            className={`nav-link ${isActive('/representatives') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Representatives
          </Link>
          <Link 
            to="/governors" 
            className={`nav-link ${isActive('/governors') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Governors
          </Link>
          <Link 
            to="/executive" 
            className={`nav-link ${isActive('/executive') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Executive
          </Link>
          <Link 
            to="/account" 
            className={`nav-link nav-account ${isActive('/account') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Account
          </Link>
        </div>
      </div>
    </nav>
  );
}
