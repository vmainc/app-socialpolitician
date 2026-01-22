/**
 * Generate comprehensive factual data for all 44 presidents
 * Creates seed data for president_facts collection
 */

interface PresidentFact {
  president_slug: string;
  category: 'basic_info' | 'birth_family' | 'education' | 'military_service' | 'career' | 'presidency' | 'achievements' | 'personal';
  fact_type: string;
  label: string;
  value?: string;
  date?: string;
  source_url?: string;
  order: number;
}

// Comprehensive facts for all 44 presidents
const allPresidentFacts: Record<string, PresidentFact[]> = {
  'george-washington': [
    { president_slug: 'george-washington', category: 'birth_family', fact_type: 'birth_date', label: 'Birth Date', value: 'February 22, 1732', date: '1732-02-22', order: 1 },
    { president_slug: 'george-washington', category: 'birth_family', fact_type: 'birthplace', label: 'Birthplace', value: 'Westmoreland County, Virginia', order: 2 },
    { president_slug: 'george-washington', category: 'birth_family', fact_type: 'death_date', label: 'Death Date', value: 'December 14, 1799', date: '1799-12-14', order: 3 },
    { president_slug: 'george-washington', category: 'birth_family', fact_type: 'spouse', label: 'Spouse', value: 'Martha Washington', order: 4 },
    { president_slug: 'george-washington', category: 'education', fact_type: 'formal_education', label: 'Formal Education', value: 'No formal college education', order: 1 },
    { president_slug: 'george-washington', category: 'military_service', fact_type: 'military_rank', label: 'Military Rank', value: 'General and Commander-in-Chief', order: 1 },
    { president_slug: 'george-washington', category: 'military_service', fact_type: 'military_service', label: 'Military Service', value: 'Commander-in-Chief of Continental Army (1775-1783)', date: '1775-06-15', order: 2 },
    { president_slug: 'george-washington', category: 'career', fact_type: 'profession', label: 'Profession', value: 'Planter, Surveyor', order: 1 },
    { president_slug: 'george-washington', category: 'presidency', fact_type: 'term', label: 'Term', value: 'April 30, 1789 - March 4, 1797', date: '1789-04-30', order: 1 },
    { president_slug: 'george-washington', category: 'presidency', fact_type: 'party', label: 'Party', value: 'Independent', order: 2 },
    { president_slug: 'george-washington', category: 'presidency', fact_type: 'vice_president', label: 'Vice President', value: 'John Adams', order: 3 },
    { president_slug: 'george-washington', category: 'achievements', fact_type: 'achievement', label: 'First President', value: 'First President of the United States', date: '1789-04-30', order: 1 },
    { president_slug: 'george-washington', category: 'achievements', fact_type: 'achievement', label: 'Constitutional Convention', value: 'Presided over Constitutional Convention', date: '1787-05-25', order: 2 },
  ],
  'john-adams': [
    { president_slug: 'john-adams', category: 'birth_family', fact_type: 'birth_date', label: 'Birth Date', value: 'October 30, 1735', date: '1735-10-30', order: 1 },
    { president_slug: 'john-adams', category: 'birth_family', fact_type: 'birthplace', label: 'Birthplace', value: 'Braintree, Massachusetts', order: 2 },
    { president_slug: 'john-adams', category: 'birth_family', fact_type: 'death_date', label: 'Death Date', value: 'July 4, 1826', date: '1826-07-04', order: 3 },
    { president_slug: 'john-adams', category: 'birth_family', fact_type: 'spouse', label: 'Spouse', value: 'Abigail Adams', order: 4 },
    { president_slug: 'john-adams', category: 'education', fact_type: 'college', label: 'Education', value: 'Harvard University', order: 1 },
    { president_slug: 'john-adams', category: 'career', fact_type: 'profession', label: 'Profession', value: 'Lawyer', order: 1 },
    { president_slug: 'john-adams', category: 'presidency', fact_type: 'term', label: 'Term', value: 'March 4, 1797 - March 4, 1801', date: '1797-03-04', order: 1 },
    { president_slug: 'john-adams', category: 'presidency', fact_type: 'party', label: 'Party', value: 'Federalist', order: 2 },
    { president_slug: 'john-adams', category: 'presidency', fact_type: 'vice_president', label: 'Vice President', value: 'Thomas Jefferson', order: 3 },
    { president_slug: 'john-adams', category: 'achievements', fact_type: 'achievement', label: 'First Vice President', value: 'First Vice President of the United States', order: 1 },
  ],
  'thomas-jefferson': [
    { president_slug: 'thomas-jefferson', category: 'birth_family', fact_type: 'birth_date', label: 'Birth Date', value: 'April 13, 1743', date: '1743-04-13', order: 1 },
    { president_slug: 'thomas-jefferson', category: 'birth_family', fact_type: 'birthplace', label: 'Birthplace', value: 'Shadwell, Virginia', order: 2 },
    { president_slug: 'thomas-jefferson', category: 'birth_family', fact_type: 'death_date', label: 'Death Date', value: 'July 4, 1826', date: '1826-07-04', order: 3 },
    { president_slug: 'thomas-jefferson', category: 'birth_family', fact_type: 'spouse', label: 'Spouse', value: 'Martha Wayles Skelton Jefferson', order: 4 },
    { president_slug: 'thomas-jefferson', category: 'education', fact_type: 'college', label: 'Education', value: 'College of William & Mary', order: 1 },
    { president_slug: 'thomas-jefferson', category: 'career', fact_type: 'profession', label: 'Profession', value: 'Lawyer, Planter, Architect, Author, Diplomat', order: 1 },
    { president_slug: 'thomas-jefferson', category: 'presidency', fact_type: 'term', label: 'Term', value: 'March 4, 1801 - March 4, 1809', date: '1801-03-04', order: 1 },
    { president_slug: 'thomas-jefferson', category: 'presidency', fact_type: 'party', label: 'Party', value: 'Democratic-Republican', order: 2 },
    { president_slug: 'thomas-jefferson', category: 'presidency', fact_type: 'vice_president', label: 'Vice Presidents', value: 'Aaron Burr, George Clinton', order: 3 },
    { president_slug: 'thomas-jefferson', category: 'achievements', fact_type: 'achievement', label: 'Declaration of Independence', value: 'Author of Declaration of Independence', date: '1776-07-04', order: 1 },
    { president_slug: 'thomas-jefferson', category: 'achievements', fact_type: 'achievement', label: 'Louisiana Purchase', value: 'Louisiana Purchase', date: '1803-04-30', order: 2 },
    { president_slug: 'thomas-jefferson', category: 'achievements', fact_type: 'achievement', label: 'Lewis and Clark', value: 'Lewis and Clark Expedition launched', date: '1804-05-14', order: 3 },
  ],
  // Continue with more presidents...
};

// This is a template - I'll create the full comprehensive list
export function getAllFacts(): PresidentFact[] {
  const allFacts: PresidentFact[] = [];
  for (const facts of Object.values(allPresidentFacts)) {
    allFacts.push(...facts);
  }
  return allFacts;
}
