import { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';
import './Account.css';

type View = 'signin' | 'signup';

export default function Account() {
  const [view, setView] = useState<View>('signin');
  const [user, setUser] = useState<RecordModel | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sync auth state from PocketBase
  useEffect(() => {
    setUser(pb.authStore.model as RecordModel | null);
    const unsub = pb.authStore.onChange(() => {
      setUser(pb.authStore.model as RecordModel | null);
    });
    return () => unsub();
  }, []);

  // Sync view with hash so "Sign up" link works
  useEffect(() => {
    const hash = window.location.hash.slice(1).toLowerCase();
    if (hash === 'signup') setView('signup');
    else if (hash === 'signin') setView('signin');
  }, []);

  const switchToSignUp = (e: React.MouseEvent) => {
    e.preventDefault();
    setView('signup');
    setError('');
    setSuccess('');
    window.history.replaceState(null, '', '#signup');
  };

  const switchToSignIn = (e: React.MouseEvent) => {
    e.preventDefault();
    setView('signin');
    setError('');
    setSuccess('');
    window.history.replaceState(null, '', '#signin');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await pb.collection('users').authWithPassword(email, password);
      setSuccess('Signed in.');
      setPassword('');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : 'Sign in failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (password !== passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm,
      });
      await pb.collection('users').authWithPassword(email, password);
      setSuccess('Account created. You are signed in.');
      setPassword('');
      setPasswordConfirm('');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : 'Sign up failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    pb.authStore.clear();
    setEmail('');
    setPassword('');
    setPasswordConfirm('');
    setView('signin');
  };

  if (user) {
    return (
      <div className="account-page">
        <div className="account-container">
          <h1>Account</h1>
          <div className="account-info">
            <p><strong>Email:</strong> {user.email ?? email}</p>
            <button onClick={handleSignOut} className="btn-sign-out" type="button">
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
        <h1>{view === 'signup' ? 'Create account' : 'Sign In'}</h1>

        {view === 'signin' ? (
          <form onSubmit={handleSignIn} className="account-form">
            {error && <div className="account-message account-error">{error}</div>}
            {success && <div className="account-message account-success">{success}</div>}
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                autoComplete="email"
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
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn-sign-in" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
            <p className="account-toggle">
              Don&apos;t have an account?{' '}
              <a href="#signup" onClick={switchToSignUp}>Sign up</a>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="account-form">
            {error && <div className="account-message account-error">{error}</div>}
            {success && <div className="account-message account-success">{success}</div>}
            <div className="form-group">
              <label htmlFor="signup-email">Email</label>
              <input
                type="email"
                id="signup-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label htmlFor="signup-password">Password</label>
              <input
                type="password"
                id="signup-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label htmlFor="signup-password-confirm">Confirm password</label>
              <input
                type="password"
                id="signup-password-confirm"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="btn-sign-in" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
            <p className="account-toggle">
              Already have an account?{' '}
              <a href="#signin" onClick={switchToSignIn}>Sign in</a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
