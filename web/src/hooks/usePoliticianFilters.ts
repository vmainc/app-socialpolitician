/**
 * Hook for managing politician search filters, sorting, and pagination
 * Syncs with URL query parameters for shareable links
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export type OfficeType = 'senator' | 'representative' | 'governor' | 'all';
export type PartyType = 'Democratic' | 'Republican' | 'Independent' | 'Other' | 'all';
export type SortOption = 'name' | '-name' | '-created' | 'created' | 'state' | 'party';

export interface PoliticianFilters {
  searchText: string;
  selectedState: string;
  selectedOffice: OfficeType;
  selectedParty: PartyType;
  hasPhoto: boolean;
  sort: SortOption;
  page: number;
  perPage: number;
}

const DEFAULT_FILTERS: PoliticianFilters = {
  searchText: '',
  selectedState: 'all',
  selectedOffice: 'all',
  selectedParty: 'all',
  hasPhoto: false,
  sort: 'name',
  page: 1,
  perPage: 24,
};

/**
 * Normalize party values for filtering
 * Handles variations like "Democrat" vs "Democratic", "R" vs "Republican", etc.
 */
function normalizePartyForFilter(party: string | null | undefined): string | null {
  if (!party) return null;
  
  const normalized = party.toLowerCase().trim();
  
  // Map variations to standard values
  if (normalized.includes('democrat')) return 'Democratic';
  if (normalized.includes('republican') || normalized === 'r') return 'Republican';
  if (normalized.includes('independent') || normalized === 'i') return 'Independent';
  
  return party; // Return as-is if no match
}

/**
 * Escape special characters in PocketBase filter strings
 */
function escapeFilterValue(value: string): string {
  // PocketBase uses double quotes, so escape them
  return value.replace(/"/g, '\\"');
}

/**
 * Build PocketBase filter string from filter state
 */
export function buildPocketBaseFilter(filters: PoliticianFilters): string {
  const conditions: string[] = [];
  
  // Search text (name OR office_title)
  if (filters.searchText.trim()) {
    const searchTerm = escapeFilterValue(filters.searchText.trim());
    // Use OR for search across multiple fields
    conditions.push(`(name~"${searchTerm}" || office_title~"${searchTerm}")`);
  }
  
  // Office type - use office_type (text) as primary, chamber (select) as fallback
  if (filters.selectedOffice !== 'all') {
    if (filters.selectedOffice === 'senator') {
      conditions.push(`(office_type="senator" || chamber="Senator")`);
    } else if (filters.selectedOffice === 'representative') {
      conditions.push(`(office_type="representative" || chamber="Representative")`);
    } else if (filters.selectedOffice === 'governor') {
      conditions.push(`(office_type="governor" || chamber="Governor")`);
    } else {
      conditions.push(`office_type="${filters.selectedOffice}"`);
    }
  }
  
  // State
  if (filters.selectedState !== 'all') {
    conditions.push(`state="${filters.selectedState}"`);
  }
  
  // Party - use exact match (schema field is 'party' with select values)
  if (filters.selectedParty !== 'all') {
    const normalizedParty = normalizePartyForFilter(filters.selectedParty);
    if (normalizedParty) {
      // Map to schema values: "Democrat", "Republican", "Independent"
      let partyValue = normalizedParty;
      if (normalizedParty.toLowerCase().includes('democrat')) {
        partyValue = 'Democrat';
      } else if (normalizedParty.toLowerCase().includes('republican')) {
        partyValue = 'Republican';
      } else if (normalizedParty.toLowerCase().includes('independent')) {
        partyValue = 'Independent';
      }
      conditions.push(`party="${partyValue}"`);
    }
  }
  
  // Has Photo filter
  if (filters.hasPhoto) {
    conditions.push(`photo != ""`);
  }
  
  // Note: Former/Retired filtering is done in frontend using status field
  
  const filterString = conditions.length > 0 ? conditions.join(' && ') : '';
  
  // Runtime assertion: prevent !~ usage (PocketBase doesn't reliably support it)
  if (filterString.includes('!~')) {
    const error = new Error(
      `❌ FORBIDDEN: PocketBase filter contains !~ operator which is not reliably supported.\n` +
      `   Filter: ${filterString}\n` +
      `   Use pbNotContains() helper from lib/pb.ts instead`
    );
    console.error(error);
    throw error;
  }
  
  console.log('🔧 Built filter:', {
    filters,
    conditions,
    filterString,
  });
  return filterString;
}

/**
 * Hook for managing politician filters with URL sync
 */
export function usePoliticianFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize from URL params or defaults
  const [filters, setFilters] = useState<PoliticianFilters>(() => {
    return {
      searchText: searchParams.get('q') || DEFAULT_FILTERS.searchText,
      selectedState: searchParams.get('state') || DEFAULT_FILTERS.selectedState,
      selectedOffice: (searchParams.get('office') as OfficeType) || DEFAULT_FILTERS.selectedOffice,
      selectedParty: (searchParams.get('party') as PartyType) || DEFAULT_FILTERS.selectedParty,
      hasPhoto: searchParams.get('hasPhoto') === 'true',
      sort: (searchParams.get('sort') as SortOption) || DEFAULT_FILTERS.sort,
      page: parseInt(searchParams.get('page') || '1', 10),
      perPage: parseInt(searchParams.get('perPage') || String(DEFAULT_FILTERS.perPage), 10),
    };
  });
  
  // Update URL when filters change (debounced for search)
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.searchText) params.set('q', filters.searchText);
    if (filters.selectedState !== 'all') params.set('state', filters.selectedState);
    if (filters.selectedOffice !== 'all') params.set('office', filters.selectedOffice);
    if (filters.selectedParty !== 'all') params.set('party', filters.selectedParty);
    if (filters.hasPhoto) params.set('hasPhoto', 'true');
    if (filters.sort !== DEFAULT_FILTERS.sort) params.set('sort', filters.sort);
    if (filters.page > 1) params.set('page', String(filters.page));
    if (filters.perPage !== DEFAULT_FILTERS.perPage) params.set('perPage', String(filters.perPage));
    
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);
  
  // Build PocketBase filter string
  const pbFilter = useMemo(() => buildPocketBaseFilter(filters), [filters]);
  
  // Update functions
  const updateSearchText = useCallback((text: string) => {
    setFilters(prev => ({ ...prev, searchText: text, page: 1 }));
  }, []);
  
  const updateState = useCallback((state: string) => {
    setFilters(prev => ({ ...prev, selectedState: state, page: 1 }));
  }, []);
  
  const updateOffice = useCallback((office: OfficeType) => {
    setFilters(prev => ({ ...prev, selectedOffice: office, page: 1 }));
  }, []);
  
  const updateParty = useCallback((party: PartyType) => {
    setFilters(prev => ({ ...prev, selectedParty: party, page: 1 }));
  }, []);
  
  const updateHasPhoto = useCallback((hasPhoto: boolean) => {
    setFilters(prev => ({ ...prev, hasPhoto, page: 1 }));
  }, []);
  
  const updateSort = useCallback((sort: SortOption) => {
    setFilters(prev => ({ ...prev, sort }));
  }, []);
  
  const updatePage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);
  
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);
  
  // Debounced search (300ms)
  const [debouncedSearchText, setDebouncedSearchText] = useState(filters.searchText);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(filters.searchText);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [filters.searchText]);
  
  return {
    filters: {
      ...filters,
      searchText: debouncedSearchText, // Use debounced version for actual filtering
    },
    pbFilter,
    updateSearchText,
    updateState,
    updateOffice,
    updateParty,
    updateHasPhoto,
    updateSort,
    updatePage,
    resetFilters,
  };
}

/**
 * US States list for dropdown
 */
export const US_STATES = [
  { value: 'all', label: 'All States' },
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
];

export const OFFICE_OPTIONS = [
  { value: 'all', label: 'All Offices' },
  { value: 'senator', label: 'Senator' },
  { value: 'representative', label: 'Representative' },
  { value: 'governor', label: 'Governor' },
];

export const PARTY_OPTIONS = [
  { value: 'all', label: 'All Parties' },
  { value: 'Democratic', label: 'Democratic' },
  { value: 'Republican', label: 'Republican' },
  { value: 'Independent', label: 'Independent' },
  { value: 'Other', label: 'Other' },
];

export const SORT_OPTIONS = [
  { value: 'name', label: 'A-Z' },
  { value: '-name', label: 'Z-A' },
  { value: '-created', label: 'Newest' },
  { value: 'created', label: 'Oldest' },
];
