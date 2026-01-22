import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

export default function Navigation() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="main-navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <span className="logo-text">Social Politician</span>
        </Link>
        
        <div className="nav-links">
          <Link 
            to="/senators" 
            className={`nav-link ${isActive('/senators') ? 'active' : ''}`}
          >
            Senators
          </Link>
          <Link 
            to="/representatives" 
            className={`nav-link ${isActive('/representatives') ? 'active' : ''}`}
          >
            Representatives
          </Link>
          <Link 
            to="/governors" 
            className={`nav-link ${isActive('/governors') ? 'active' : ''}`}
          >
            Governors
          </Link>
          <Link 
            to="/account" 
            className={`nav-link nav-account ${isActive('/account') ? 'active' : ''}`}
          >
            Account
          </Link>
        </div>
      </div>
    </nav>
  );
}
