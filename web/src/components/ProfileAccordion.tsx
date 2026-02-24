/**
 * Reusable profile section accordion – closed by default, same look as Biography.
 */

import { useState, type ReactNode } from 'react';
import './ProfileAccordion.css';

interface ProfileAccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  /** When true, children mount only when open. Use for third-party embeds (Facebook, YouTube) so they init when visible. */
  mountContentOnlyWhenOpen?: boolean;
}

export default function ProfileAccordion({ title, children, defaultOpen = false, mountContentOnlyWhenOpen = false }: ProfileAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = `profile-accordion-${title.replace(/\s+/g, '-').toLowerCase()}`;
  const panelId = `${id}-panel`;
  const triggerId = `${id}-trigger`;

  const content = mountContentOnlyWhenOpen ? (open ? children : null) : children;

  return (
    <div className="profile-section profile-accordion">
      <button
        type="button"
        className="profile-accordion-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        id={triggerId}
      >
        <h2 className="profile-section-title">{title}</h2>
        <span className="profile-accordion-icon" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        className={`profile-accordion-panel ${open ? 'is-open' : ''}`}
        aria-hidden={!open}
      >
        <div className="profile-accordion-content">
          {content}
        </div>
      </div>
    </div>
  );
}
