/**
 * Session management utilities
 * Stores user session data in localStorage
 */

const SESSION_ID_KEY = 'sp_session_id';
const USER_NAME_KEY = 'sp_user_name';

/**
 * Get or create a session ID
 */
export function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

/**
 * Get the user's name from localStorage
 */
export function getUserName(): string {
  return localStorage.getItem(USER_NAME_KEY) || '';
}

/**
 * Set the user's name in localStorage
 */
export function setUserName(name: string): void {
  if (name.trim()) {
    localStorage.setItem(USER_NAME_KEY, name.trim());
  } else {
    localStorage.removeItem(USER_NAME_KEY);
  }
}
