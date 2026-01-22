/**
 * Validation utilities for Conversation Persona fields
 */

interface PersonaData {
  persona_voice_summary?: string;
  persona_traits?: string[] | string | null;
  persona_rhetoric_patterns?: string[] | string | null;
  persona_pushback_playbook?: string | object | null;
  persona_red_lines?: string[] | string | null;
  persona_citation_style?: 'none' | 'light' | 'source-forward' | string | null;
  persona_accuracy_mode?: 'historical-only' | 'recent-but-cautious' | string | null;
  persona_example_snippets?: string[] | string | null;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
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
 * Validate persona data structure
 */
export function validatePersonaData(persona: PersonaData): ValidationResult {
  const errors: string[] = [];

  // Validate persona_voice_summary
  if (persona.persona_voice_summary !== undefined) {
    if (typeof persona.persona_voice_summary !== 'string') {
      errors.push('persona_voice_summary must be a string');
    } else if (persona.persona_voice_summary.length > 1000) {
      errors.push('persona_voice_summary exceeds 1000 characters');
    }
  }

  // Validate persona_traits
  if (persona.persona_traits !== undefined && persona.persona_traits !== null) {
    const traits = parseJsonField<string[]>(persona.persona_traits);
    if (!traits) {
      errors.push('persona_traits must be a valid JSON array');
    } else if (!Array.isArray(traits)) {
      errors.push('persona_traits must be an array');
    } else {
      traits.forEach((trait, idx) => {
        if (typeof trait !== 'string') {
          errors.push(`persona_traits[${idx}] must be a string`);
        }
      });
    }
  }

  // Validate persona_rhetoric_patterns
  if (persona.persona_rhetoric_patterns !== undefined && persona.persona_rhetoric_patterns !== null) {
    const patterns = parseJsonField<string[]>(persona.persona_rhetoric_patterns);
    if (!patterns) {
      errors.push('persona_rhetoric_patterns must be a valid JSON array');
    } else if (!Array.isArray(patterns)) {
      errors.push('persona_rhetoric_patterns must be an array');
    } else {
      patterns.forEach((pattern, idx) => {
        if (typeof pattern !== 'string') {
          errors.push(`persona_rhetoric_patterns[${idx}] must be a string`);
        }
      });
    }
  }

  // Validate persona_pushback_playbook
  if (persona.persona_pushback_playbook !== undefined && persona.persona_pushback_playbook !== null) {
    const playbook = parseJsonField<{
      when_user_accuses?: string;
      when_user_demands_apology?: string;
      when_user_challenges_facts?: string;
      when_user_gets_hostile?: string;
    }>(persona.persona_pushback_playbook);
    
    if (!playbook) {
      errors.push('persona_pushback_playbook must be a valid JSON object');
    } else if (typeof playbook !== 'object' || Array.isArray(playbook)) {
      errors.push('persona_pushback_playbook must be an object');
    } else {
      const validKeys = ['when_user_accuses', 'when_user_demands_apology', 'when_user_challenges_facts', 'when_user_gets_hostile'];
      Object.keys(playbook).forEach(key => {
        if (!validKeys.includes(key)) {
          errors.push(`persona_pushback_playbook has invalid key: ${key}`);
        } else if (typeof playbook[key as keyof typeof playbook] !== 'string') {
          errors.push(`persona_pushback_playbook.${key} must be a string`);
        }
      });
    }
  }

  // Validate persona_red_lines
  if (persona.persona_red_lines !== undefined && persona.persona_red_lines !== null) {
    const redLines = parseJsonField<string[]>(persona.persona_red_lines);
    if (!redLines) {
      errors.push('persona_red_lines must be a valid JSON array');
    } else if (!Array.isArray(redLines)) {
      errors.push('persona_red_lines must be an array');
    } else {
      redLines.forEach((line, idx) => {
        if (typeof line !== 'string') {
          errors.push(`persona_red_lines[${idx}] must be a string`);
        }
      });
    }
  }

  // Validate persona_citation_style
  if (persona.persona_citation_style !== undefined && persona.persona_citation_style !== null) {
    const validStyles = ['none', 'light', 'source-forward'];
    if (!validStyles.includes(persona.persona_citation_style)) {
      errors.push(`persona_citation_style must be one of: ${validStyles.join(', ')}`);
    }
  }

  // Validate persona_accuracy_mode
  if (persona.persona_accuracy_mode !== undefined && persona.persona_accuracy_mode !== null) {
    const validModes = ['historical-only', 'recent-but-cautious'];
    if (!validModes.includes(persona.persona_accuracy_mode)) {
      errors.push(`persona_accuracy_mode must be one of: ${validModes.join(', ')}`);
    }
  }

  // Validate persona_example_snippets
  if (persona.persona_example_snippets !== undefined && persona.persona_example_snippets !== null) {
    const snippets = parseJsonField<string[]>(persona.persona_example_snippets);
    if (!snippets) {
      errors.push('persona_example_snippets must be a valid JSON array');
    } else if (!Array.isArray(snippets)) {
      errors.push('persona_example_snippets must be an array');
    } else {
      snippets.forEach((snippet, idx) => {
        if (typeof snippet !== 'string') {
          errors.push(`persona_example_snippets[${idx}] must be a string`);
        } else if (snippet.length > 200) {
          errors.push(`persona_example_snippets[${idx}] exceeds 200 characters`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that system prompt can be constructed without undefined values
 */
export function validateSystemPromptConstruction(president: {
  system_prompt?: string;
  persona_voice_summary?: string;
  persona_traits?: string[] | string | null;
  persona_rhetoric_patterns?: string[] | string | null;
  persona_pushback_playbook?: string | object | null;
  persona_red_lines?: string[] | string | null;
  persona_citation_style?: string | null;
  persona_accuracy_mode?: string | null;
  persona_example_snippets?: string[] | string | null;
}): ValidationResult {
  const errors: string[] = [];

  // Check that required fields exist
  if (!president.system_prompt) {
    errors.push('system_prompt is required');
  }

  // Try to parse JSON fields to ensure they're valid
  if (president.persona_traits) {
    const traits = parseJsonField<string[]>(president.persona_traits);
    if (!traits && president.persona_traits !== null) {
      errors.push('persona_traits is not valid JSON');
    }
  }

  if (president.persona_rhetoric_patterns) {
    const patterns = parseJsonField<string[]>(president.persona_rhetoric_patterns);
    if (!patterns && president.persona_rhetoric_patterns !== null) {
      errors.push('persona_rhetoric_patterns is not valid JSON');
    }
  }

  if (president.persona_pushback_playbook) {
    const playbook = parseJsonField<object>(president.persona_pushback_playbook);
    if (!playbook && president.persona_pushback_playbook !== null) {
      errors.push('persona_pushback_playbook is not valid JSON');
    }
  }

  if (president.persona_red_lines) {
    const redLines = parseJsonField<string[]>(president.persona_red_lines);
    if (!redLines && president.persona_red_lines !== null) {
      errors.push('persona_red_lines is not valid JSON');
    }
  }

  if (president.persona_example_snippets) {
    const snippets = parseJsonField<string[]>(president.persona_example_snippets);
    if (!snippets && president.persona_example_snippets !== null) {
      errors.push('persona_example_snippets is not valid JSON');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
