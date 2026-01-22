import { useState } from 'react';
import './Account.css';

export default function Account() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement PocketBase authentication
    console.log('Sign in:', { email, password });
    setIsSignedIn(true);
  };

  const handleSignOut = () => {
    setIsSignedIn(false);
    setEmail('');
    setPassword('');
  };

  if (isSignedIn) {
    return (
      <div className="account-page">
        <div className="account-container">
          <h1>Account</h1>
          <div className="account-info">
            <p><strong>Email:</strong> {email}</p>
            <button onClick={handleSignOut} className="btn-sign-out">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <div className="account-container">
        <h1>Sign In</h1>
        <form onSubmit={handleSignIn} className="sign-in-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn-sign-in">
            Sign In
          </button>
          <p className="sign-up-link">
            Don't have an account? <a href="#signup">Sign up</a>
          </p>
        </form>
      </div>
    </div>
  );
}
