/**
 * Profile Comments – comment section for politician profiles
 * Supports: text, emojis, images, gifs, videos
 * Comments appear under the submission box and list downward
 */

import { useState, useEffect, useRef } from 'react';
import { pb } from '../lib/pocketbase';

const EMOJI_BUTTONS = ['😀', '😂', '👍', '❤️', '👎', '🔥', '👏', '🙏', '💯', '✨'];

export interface ProfileComment {
  id: string;
  politician: string;
  author_name?: string;
  content: string;
  media?: string | string[];
  created: string;
  updated?: string;
}

interface ProfileCommentsProps {
  politicianId: string;
}

function insertAtCursor(textarea: HTMLTextAreaElement, text: string) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? start;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  const newValue = before + text + after;
  textarea.value = newValue;
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  textarea.focus();
  return newValue;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function getMediaUrl(record: ProfileComment, filename: string): string {
  return pb.files.getURL(record, filename);
}

export default function ProfileComments({ politicianId }: ProfileCommentsProps) {
  const [comments, setComments] = useState<ProfileComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When logged in, prefill author_name so "My comments" on account page can find them
  useEffect(() => {
    const model = pb.authStore.model as { email?: string } | null;
    if (model?.email && !authorName) setAuthorName(model.email);
  }, []);

  async function loadComments() {
    if (!politicianId?.trim()) {
      setLoading(false);
      return;
    }
    try {
      // Escape id for filter (prevent breakage from quotes/backslashes)
      const safeId = politicianId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const result = await pb.collection('profile_comments').getList<ProfileComment>(1, 100, {
        filter: `politician="${safeId}"`,
        sort: 'created',
      });
      // Newest first (PocketBase sort=created is ascending; some servers 400 on -created)
      setComments([...result.items].reverse());
    } catch (err: unknown) {
      const e = err as { status?: number; data?: { message?: string }; message?: string };
      console.error('Failed to load comments:', e?.message || e);
      if (e?.data) console.error('PB response:', e.data);
      setError(e?.data?.message || e?.message || 'Could not load comments');
      setComments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComments();
  }, [politicianId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed && mediaFiles.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set('politician', politicianId);
      formData.set('content', trimmed || '(media)');
      if (authorName.trim()) formData.set('author_name', authorName.trim());
      mediaFiles.forEach((file) => formData.append('media', file));
      await pb.collection('profile_comments').create(formData);
      setContent('');
      setMediaFiles([]);
      await loadComments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to post comment';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleEmojiClick(emoji: string) {
    if (textareaRef.current) {
      const newVal = insertAtCursor(textareaRef.current, emoji);
      setContent(newVal);
    }
  }

  function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const valid = files.filter((f) => {
      const ok = f.type.startsWith('image/') || f.type.startsWith('video/');
      if (!ok) return false;
      if (f.size > 10 * 1024 * 1024) return false;
      return true;
    });
    setMediaFiles((prev) => [...prev, ...valid].slice(0, 5));
    e.target.value = '';
  }

  function removeMedia(index: number) {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <section className="profile-comments">
      <h2 className="profile-section-title">Comments</h2>

      <form onSubmit={handleSubmit} className="profile-comments-form">
        <div className="profile-comments-form-row">
          <label htmlFor="comment-author-name" className="profile-comments-label">
            Your name (optional)
          </label>
          <input
            id="comment-author-name"
            type="text"
            placeholder="How you’d like to be shown"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="profile-comments-name"
            maxLength={100}
          />
        </div>
        <div className="profile-comments-form-main">
          <textarea
            ref={textareaRef}
            placeholder="Add a comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="profile-comments-textarea"
            rows={3}
            disabled={submitting}
          />
          <div className="profile-comments-toolbar">
            <div className="profile-comments-emoji-row">
              {EMOJI_BUTTONS.map((emoji, i) => (
                <button
                  key={i}
                  type="button"
                  className="profile-comments-emoji-btn"
                  onClick={() => handleEmojiClick(emoji)}
                  title="Insert emoji"
                  aria-label={`Insert ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="profile-comments-actions">
              <label className="profile-comments-upload-btn">
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleMediaChange}
                  disabled={submitting || mediaFiles.length >= 5}
                />
                📷 Add image / GIF / video
              </label>
              <button type="submit" disabled={submitting} className="profile-comments-submit">
                {submitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
          {mediaFiles.length > 0 && (
            <div className="profile-comments-preview">
              {mediaFiles.map((file, i) => (
                <div key={i} className="profile-comments-preview-item">
                  {file.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(file)} alt="" />
                  ) : (
                    <video src={URL.createObjectURL(file)} muted />
                  )}
                  <button type="button" onClick={() => removeMedia(i)} className="profile-comments-remove-media" aria-label="Remove">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {error && <p className="profile-comments-error">{error}</p>}
      </form>

      <div className="profile-comments-list">
        {loading ? (
          <p className="profile-comments-loading">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="profile-comments-empty">No comments yet. Be the first to comment!</p>
        ) : (
          <ul className="profile-comments-thread" aria-label="Comments">
            {comments.map((c) => (
              <li key={c.id} className="profile-comments-item">
                <div className="profile-comments-item-header">
                  <span className="profile-comments-author">{c.author_name || 'Anonymous'}</span>
                  <span className="profile-comments-date">{formatDate(c.created)}</span>
                </div>
                <div className="profile-comments-item-content">{c.content}</div>
                {c.media && (Array.isArray(c.media) ? c.media : [c.media]).length > 0 && (
                  <div className="profile-comments-item-media">
                    {(Array.isArray(c.media) ? c.media : [c.media]).map((filename: string, i: number) => {
                      const url = getMediaUrl(c, filename);
                      const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(filename);
                      return isVideo ? (
                        <video key={i} src={url} controls />
                      ) : (
                        <img key={i} src={url} alt="" loading="lazy" />
                      );
                    })}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
