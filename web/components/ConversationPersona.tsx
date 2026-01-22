import { useState } from 'react';

interface PersonaData {
  persona_voice_summary?: string;
  persona_traits?: string[] | string | null;
  persona_rhetoric_patterns?: string[] | string | null;
  persona_pushback_playbook?: string | object | null;
  persona_red_lines?: string[] | string | null;
  persona_citation_style?: string | null;
  persona_accuracy_mode?: string | null;
  persona_example_snippets?: string[] | string | null;
}

interface ConversationPersonaProps {
  persona: PersonaData;
}

/**
 * Parse JSON field that might be string or already parsed
 */
function parseJsonField<T>(field: string | T | null | undefined): T | null {
  if (!field) return null;
  if (typeof field === 'string') {
    try {
      return JSON.parse(field) as T;
    } catch {
      return null;
    }
  }
  return field as T;
}

export function ConversationPersona({ persona }: ConversationPersonaProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if any persona data exists
  const hasPersonaData = !!(
    persona.persona_voice_summary ||
    persona.persona_traits ||
    persona.persona_rhetoric_patterns ||
    persona.persona_pushback_playbook ||
    persona.persona_red_lines ||
    persona.persona_citation_style ||
    persona.persona_accuracy_mode ||
    persona.persona_example_snippets
  );

  if (!hasPersonaData) {
    return null;
  }

  const traits = parseJsonField<string[]>(persona.persona_traits);
  const rhetoricPatterns = parseJsonField<string[]>(persona.persona_rhetoric_patterns);
  const pushbackPlaybook = parseJsonField<{
    when_user_accuses?: string;
    when_user_demands_apology?: string;
    when_user_challenges_facts?: string;
    when_user_gets_hostile?: string;
  }>(persona.persona_pushback_playbook);
  const redLines = parseJsonField<string[]>(persona.persona_red_lines);
  const exampleSnippets = parseJsonField<string[]>(persona.persona_example_snippets);

  return (
    <div className="conversation-persona-section" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: '0.75rem',
          textAlign: 'left',
          background: 'transparent',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          fontWeight: '500',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Conversation Persona</span>
        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {isExpanded && (
        <div style={{ padding: '1rem', border: '1px solid #ddd', borderTop: 'none', borderRadius: '0 0 4px 4px', backgroundColor: '#f9f9f9' }}>
          {persona.persona_voice_summary && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '600' }}>Voice Summary</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.5' }}>{persona.persona_voice_summary}</p>
            </div>
          )}

          {traits && traits.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '600' }}>Traits</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {traits.map((trait, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#e3f2fd',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      color: '#1976d2',
                    }}
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          )}

          {pushbackPlaybook && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '600' }}>How They Handle Pushback</h4>
              <div style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
                {pushbackPlaybook.when_user_accuses && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>When accused:</strong> {pushbackPlaybook.when_user_accuses}
                  </div>
                )}
                {pushbackPlaybook.when_user_demands_apology && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>When apology demanded:</strong> {pushbackPlaybook.when_user_demands_apology}
                  </div>
                )}
                {pushbackPlaybook.when_user_challenges_facts && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>When facts challenged:</strong> {pushbackPlaybook.when_user_challenges_facts}
                  </div>
                )}
                {pushbackPlaybook.when_user_gets_hostile && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>When user gets hostile:</strong> {pushbackPlaybook.when_user_gets_hostile}
                  </div>
                )}
              </div>
            </div>
          )}

          {rhetoricPatterns && rhetoricPatterns.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '600' }}>Rhetoric Patterns</h4>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', lineHeight: '1.6' }}>
                {rhetoricPatterns.map((pattern, idx) => (
                  <li key={idx}>{pattern}</li>
                ))}
              </ul>
            </div>
          )}

          {(persona.persona_citation_style || persona.persona_accuracy_mode) && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '600' }}>Accuracy & Citations</h4>
              <div style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
                {persona.persona_citation_style && (
                  <div>Citation style: <strong>{persona.persona_citation_style}</strong></div>
                )}
                {persona.persona_accuracy_mode && (
                  <div>Accuracy mode: <strong>{persona.persona_accuracy_mode}</strong></div>
                )}
              </div>
            </div>
          )}

          {redLines && redLines.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '600', color: '#d32f2f' }}>Red Lines</h4>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', lineHeight: '1.6', color: '#666' }}>
                {redLines.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          {exampleSnippets && exampleSnippets.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '600' }}>Example Response Styles</h4>
              <div style={{ fontSize: '0.85rem', lineHeight: '1.6', fontStyle: 'italic', color: '#555' }}>
                {exampleSnippets.map((snippet, idx) => (
                  <div key={idx} style={{ marginBottom: '0.5rem', paddingLeft: '1rem', borderLeft: '2px solid #ddd' }}>
                    "{snippet}"
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
