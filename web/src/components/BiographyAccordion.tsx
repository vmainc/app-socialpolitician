/**
 * Biography accordion – closed by default, shows 2–3 paragraph synopsis.
 */

import { useState } from 'react';
import { decodeHtmlEntities } from '../utils/decodeHtmlEntities';
import './BiographyAccordion.css';

interface BiographyAccordionProps {
  content: string;
}

export default function BiographyAccordion({ content }: BiographyAccordionProps) {
  const [open, setOpen] = useState(false);

  if (!content?.trim()) return null;

  // Split into paragraphs (double newline or more), decode HTML entities, trim
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => decodeHtmlEntities(p.trim()))
    .filter(Boolean);

  return (
    <div className="profile-section biography-accordion">
      <button
        type="button"
        className="biography-accordion-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="biography-accordion-panel"
        id="biography-accordion-trigger"
      >
        <h2 className="profile-section-title">Biography</h2>
        <span className="biography-accordion-icon" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      <div
        id="biography-accordion-panel"
        role="region"
        aria-labelledby="biography-accordion-trigger"
        className={`biography-accordion-panel ${open ? 'is-open' : ''}`}
        aria-hidden={!open}
      >
        <div className="biography-accordion-content">
          {paragraphs.length > 0 ? (
            paragraphs.map((p, i) => (
              <p key={i} className="profile-bio biography-accordion-para">
                {p}
              </p>
            ))
          ) : (
            <p className="profile-bio biography-accordion-para">
              {decodeHtmlEntities(content.trim())}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
