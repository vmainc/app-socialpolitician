import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';
import './Account.css';

interface MyComment {
  id: string;
  content: string;
  author_name?: string;
  created: string;
  politician: string;
  expand?: { politician?: { slug?: string; name?: string } };
}

interface FavoriteRecord {
  id: string;
  politician: string;
  expand?: { politician?: { slug?: string; name?: string } };
}

interface PoliticianInfo {
  slug: string;
  name?: string;
}

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
  const [myComments, setMyComments] = useState<MyComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteRecord[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [politicianDetails, setPoliticianDetails] = useState<Record<string, PoliticianInfo>>({});
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Sync auth state from PocketBase
  useEffect(() => {
    setUser(pb.authStore.model as RecordModel | null);
    const unsub = pb.authStore.onChange(() => {
      setUser(pb.authStore.model as RecordModel | null);
    });
    return () => unsub();
  }, []);

  // Only app users (users collection) have favorites/comments; admins see sign-in form
  const isAppUser = !!user && (user as RecordModel & { collectionName?: string }).collectionName === 'users';

  // Load current user's comments (by author_name = email) when logged in as app user
  useEffect(() => {
    if (!isAppUser) {
      setMyComments([]);
      return;
    }
    const model = pb.authStore.model as { email?: string } | null;
    if (!model?.email) {
      setMyComments([]);
      return;
    }
    let cancelled = false;
    const safeEmail = model.email.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    setCommentsLoading(true);
    pb.collection('profile_comments')
      .getList<MyComment>(1, 50, {
        filter: `author_name="${safeEmail}"`,
        sort: '-created',
        expand: 'politician',
      })
      .then((res) => {
        if (!cancelled) setMyComments(res.items);
      })
      .catch(() => {
        if (!cancelled) setMyComments([]);
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
      });
    return () => { cancelled = true; };
  }, [isAppUser, user?.id, (user as { email?: string })?.email]);

  // Load current user's favorites when logged in as app user; refetch on window focus
  useEffect(() => {
    if (!isAppUser || !user?.id) {
      setFavorites([]);
      return;
    }
    let cancelled = false;
    const fetchFavorites = () => {
      setFavoritesLoading(true);
      // Minimal request: no filter, no sort (list rule restricts to current user; some PB setups 400 on sort)
      pb.collection('user_favorites')
        .getList<FavoriteRecord>(1, 100)
        .then((res) => {
          if (!cancelled) setFavorites(res.items || []);
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            const e = err as { status?: number; response?: Record<string, unknown> };
            try {
              console.error('Account: favorites 400 response', JSON.stringify(e?.response ?? e));
            } catch {
              console.error('Account: failed to load favorites', e?.status, e?.response ?? e);
            }
            setFavorites([]);
          }
        })
        .finally(() => {
          if (!cancelled) setFavoritesLoading(false);
        });
    };
    fetchFavorites();
    const onFocus = () => {
      if (pb.authStore.model?.id) fetchFavorites();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [isAppUser, user?.id]);

  // When favorites have items but expand.politician is missing, fetch politician details so we can show links
  useEffect(() => {
    const missing = favorites.filter((f) => f.politician && !f.expand?.politician?.slug);
    if (missing.length === 0) return;
    const ids = [...new Set(missing.map((f) => f.politician))];
    Promise.all(ids.map((id) => pb.collection('politicians').getOne(id).catch(() => null)))
      .then((results) => {
        const next: Record<string, PoliticianInfo> = {};
        results.forEach((rec, i) => {
          if (rec?.id && rec?.slug) next[ids[i]] = { slug: rec.slug, name: rec.name };
        });
        setPoliticianDetails((prev) => ({ ...prev, ...next }));
      });
  }, [favorites]);

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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id || !isAppUser) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose a JPEG, PNG, GIF, or WebP image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2 MB.');
      e.target.value = '';
      return;
    }
    setAvatarUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.set('avatar', file);
      const updated = await pb.collection('users').update(user.id, formData);
      // Auth store is updated automatically by SDK when updating current user
      setUser(updated as RecordModel);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Failed to update photo.';
      setError(msg);
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  function formatCommentDate(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return iso;
    }
  }

  const userWithAvatar = user as (RecordModel & { avatar?: string }) | null;
  const avatarUrl = userWithAvatar?.avatar && userWithAvatar?.id
    ? pb.files.getURL(userWithAvatar, userWithAvatar.avatar)
    : null;

  if (isAppUser) {
    return (
      <div className="account-page">
        <div className="account-container account-dashboard">
          <h1>Account</h1>
          <div className="account-profile-photo">
            <div className="account-avatar-wrap" aria-hidden>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="account-avatar-img" />
              ) : (
                <span className="account-avatar-placeholder">
                  {(user?.email ?? email).slice(0, 1).toUpperCase() || '?'}
                </span>
              )}
            </div>
            <label className="account-avatar-label">
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarChange}
                disabled={avatarUploading}
                aria-label="Change profile photo"
              />
              {avatarUploading ? 'Uploading…' : 'Change photo'}
            </label>
          </div>
          <div className="account-info">
            <p><strong>Email:</strong> {user?.email ?? email}</p>
          </div>

          <section className="account-favorites">
            <h2 className="account-section-title">Your favorites</h2>
            {favoritesLoading ? (
              <p className="account-favorites-loading">Loading your favorites…</p>
            ) : favorites.length === 0 ? (
              <p className="account-favorites-empty">
                Politicians you add to favorites (from their profile page) will appear here.
              </p>
            ) : (
              <ul className="account-favorites-list">
                {favorites.map((fav) => {
                  const slug = fav.expand?.politician?.slug ?? politicianDetails[fav.politician]?.slug;
                  const name = fav.expand?.politician?.name ?? politicianDetails[fav.politician]?.name;
                  return (
                    <li key={fav.id} className="account-favorite-item">
                      {slug ? (
                        <Link to={`/${slug}`} className="account-favorite-link">
                          {name || 'View profile'} →
                        </Link>
                      ) : (
                        <span className="account-favorites-loading">Loading…</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="account-my-comments">
            <h2 className="account-section-title">My comments</h2>
            {commentsLoading ? (
              <p className="account-comments-loading">Loading your comments…</p>
            ) : myComments.length === 0 ? (
              <p className="account-comments-empty">
                Comments you post on politician profiles (while signed in with this email) will appear here.
              </p>
            ) : (
              <ul className="account-comments-list">
                {myComments.map((c) => (
                  <li key={c.id} className="account-comment-item">
                    <div className="account-comment-avatar-wrap" aria-hidden>
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="account-comment-avatar-img" />
                      ) : (
                        <span className="account-comment-avatar-placeholder">
                          {(user?.email ?? email).slice(0, 1).toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div className="account-comment-item-inner">
                      <p className="account-comment-content">{c.content}</p>
                      <p className="account-comment-meta">
                      {c.expand?.politician?.slug ? (
                        <Link to={`/${c.expand.politician.slug}`} className="account-comment-link">
                          {c.expand.politician.name || 'View profile'} →
                        </Link>
                      ) : (
                        <span>Politician profile</span>
                      )}
                        {' · '}
                        {formatCommentDate(c.created)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="account-footer">
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
        {user && !isAppUser && (
          <>
            <p className="account-message account-info-message">
              You're signed in as an admin. Sign in below with your account email to see your favorites and comments.
            </p>
            <p className="account-toggle">
              <button type="button" onClick={handleSignOut} className="btn-sign-out-inline">
                Sign out (admin)
              </button>
            </p>
          </>
        )}
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
