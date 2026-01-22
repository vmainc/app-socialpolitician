import { getIntentGuidance } from './intent.js';

interface President {
  system_prompt: string;
  knowledge_base?: string;
  temperament_summary?: string;
  temperament_tags?: string[] | string | null;
  temperament_signature?: string;
  temperament_reaction?: string;
  // Persona fields
  persona_voice_summary?: string;
  persona_traits?: string[] | string | null;
  persona_rhetoric_patterns?: string[] | string | null;
  persona_pushback_playbook?: string | object | null;
  persona_red_lines?: string[] | string | null;
  persona_citation_style?: 'none' | 'light' | 'source-forward' | string | null;
  persona_accuracy_mode?: 'historical-only' | 'recent-but-cautious' | string | null;
  persona_example_snippets?: string[] | string | null;
}

interface BuildMessagesOptions {
  president: President;
  userName?: string;
  priorMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  contextText?: string;
  userMessage: string;
  intentGuidance?: string;
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

/**
 * Build messages array for OpenAI chat completion
 */
export function buildMessages(options: BuildMessagesOptions): Array<{
  role: 'system' | 'user' | 'assistant';
  content: string;
}> {
  const {
    president,
    userName,
    priorMessages = [],
    contextText,
    userMessage,
    intentGuidance,
  } = options;

  // Build enhanced system prompt with temperament
  let systemPrompt = president.system_prompt;
  
  // Add temperament data if available
  const temperamentParts: string[] = [];
  
  if (president.temperament_summary) {
    temperamentParts.push(`Personal Style & Temperament:\n${president.temperament_summary}`);
  }
  
  if (president.temperament_tags) {
    let tags: string[] = [];
    if (Array.isArray(president.temperament_tags)) {
      tags = president.temperament_tags;
    } else if (typeof president.temperament_tags === 'string') {
      try {
        tags = JSON.parse(president.temperament_tags);
      } catch {
        // If not JSON, treat as single tag
        tags = [president.temperament_tags];
      }
    }
    if (tags.length > 0) {
      temperamentParts.push(`Key Traits: ${tags.join(', ')}`);
    }
  }
  
  if (president.temperament_signature) {
    temperamentParts.push(`Signature Style: "${president.temperament_signature}"`);
  }
  
  if (president.temperament_reaction) {
    temperamentParts.push(`When Challenged: ${president.temperament_reaction}`);
  }
  
  if (temperamentParts.length > 0) {
    systemPrompt += `\n\n${temperamentParts.join('\n\n')}\n\nIMPORTANT: Embody these traits in your responses. Your communication style, tone, and reactions should reflect this temperament.`;
  }

  // Add Conversation Persona data if available
  const personaParts: string[] = [];
  
  if (president.persona_voice_summary) {
    personaParts.push(`Conversation Voice: ${president.persona_voice_summary}`);
  }
  
  const personaTraits = parseJsonField<string[]>(president.persona_traits);
  if (personaTraits && personaTraits.length > 0) {
    personaParts.push(`Persona Traits: ${personaTraits.join(', ')}`);
  }
  
  const rhetoricPatterns = parseJsonField<string[]>(president.persona_rhetoric_patterns);
  if (rhetoricPatterns && rhetoricPatterns.length > 0) {
    personaParts.push(`Rhetoric Patterns:\n${rhetoricPatterns.map(p => `- ${p}`).join('\n')}`);
  }
  
  const pushbackPlaybook = parseJsonField<{
    when_user_accuses?: string;
    when_user_demands_apology?: string;
    when_user_challenges_facts?: string;
    when_user_gets_hostile?: string;
  }>(president.persona_pushback_playbook);
  
  if (pushbackPlaybook) {
    const playbookParts: string[] = [];
    if (pushbackPlaybook.when_user_accuses) {
      playbookParts.push(`When user accuses: ${pushbackPlaybook.when_user_accuses}`);
    }
    if (pushbackPlaybook.when_user_demands_apology) {
      playbookParts.push(`When user demands apology: ${pushbackPlaybook.when_user_demands_apology}`);
    }
    if (pushbackPlaybook.when_user_challenges_facts) {
      playbookParts.push(`When user challenges facts: ${pushbackPlaybook.when_user_challenges_facts}`);
    }
    if (pushbackPlaybook.when_user_gets_hostile) {
      playbookParts.push(`When user gets hostile: ${pushbackPlaybook.when_user_gets_hostile}`);
    }
    if (playbookParts.length > 0) {
      personaParts.push(`Pushback Playbook:\n${playbookParts.map(p => `- ${p}`).join('\n')}`);
    }
  }
  
  const redLines = parseJsonField<string[]>(president.persona_red_lines);
  if (redLines && redLines.length > 0) {
    personaParts.push(`Red Lines (DO NOT do these):\n${redLines.map(r => `- ${r}`).join('\n')}`);
  }
  
  const exampleSnippets = parseJsonField<string[]>(president.persona_example_snippets);
  if (exampleSnippets && exampleSnippets.length > 0) {
    personaParts.push(`Example Response Styles:\n${exampleSnippets.map(e => `- "${e}"`).join('\n')}`);
  }
  
  if (personaParts.length > 0) {
    systemPrompt += `\n\nCONVERSATION PERSONA:\n${personaParts.join('\n\n')}\n\nIMPORTANT: Follow these persona guidelines in your responses. How you handle pushback, cite sources, and respond to challenges should match these patterns.`;
  }

  // Add accuracy mode rules
  if (president.persona_accuracy_mode === 'historical-only') {
    systemPrompt += `\n\nACCURACY RULES:\n- You can only speak about events up to the end of your presidency (or up to 2025 if still in office).\n- If asked about events after your term, say: "I can only speak to events during my presidency. I may be missing the latest details about what happened after my term."\n- Do not claim knowledge of current events beyond your term.`;
  } else if (president.persona_accuracy_mode === 'recent-but-cautious') {
    systemPrompt += `\n\nACCURACY RULES:\n- You may discuss recent events, but if you're uncertain about very recent developments, say: "I may be missing the latest details, but here's what I understand..."\n- Do not invent quotes, dates, or current events.\n- If asked about something you can't verify, acknowledge uncertainty rather than making claims.`;
  } else {
    // Default accuracy rules for all personas
    systemPrompt += `\n\nACCURACY RULES:\n- Do not invent quotes, dates, or current events.\n- If asked about very recent events and you can't verify, say you may be missing the latest details and offer a general response.\n- Prefer neutral phrasing and focus on reasoning.\n- Do not tell users to break laws or harm anyone.`;
  }

  // Add citation style guidance
  if (president.persona_citation_style === 'source-forward') {
    systemPrompt += `\n\nCITATION STYLE: When making factual claims, cite your sources or acknowledge uncertainty.`;
  } else if (president.persona_citation_style === 'light') {
    systemPrompt += `\n\nCITATION STYLE: You may occasionally reference sources or acknowledge uncertainty, but it's not required for every claim.`;
  }
  // 'none' means no citation guidance added

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: systemPrompt,
    },
  ];

  // Add intent guidance if provided
  if (intentGuidance) {
    messages.push({
      role: 'system',
      content: intentGuidance,
    });
  }

  // Add context (RAG or fallback)
  if (contextText) {
    messages.push({
      role: 'system',
      content: `Context excerpts (use ONLY these for factual claims. If context does not contain the answer, say you don't know or can't speak to it):\n\n${contextText}`,
    });
  } else if (president.knowledge_base) {
    messages.push({
      role: 'system',
      content: `Context you may use:\n${president.knowledge_base}`,
    });
  }

  // Add user name if provided
  if (userName) {
    messages.push({
      role: 'system',
      content: `The visitor's name is ${userName}.`,
    });
  }

  // Add prior messages in chronological order
  messages.push(...priorMessages);

  // Add current user message
  messages.push({
    role: 'user',
    content: userMessage,
  });

  return messages;
}
