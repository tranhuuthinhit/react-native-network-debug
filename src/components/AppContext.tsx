import React, { Dispatch, useContext, useMemo, useReducer } from 'react';
import {
  DetailTab,
  Filters,
  RequestMethod,
  SearchScopes,
  StatusClass,
} from '../types';
import { DEFAULT_SLOW_THRESHOLD_MS, LOGGER_MAX_REQUESTS } from '../constant';

/** Kept exported under its old name for backwards compatibility. */
export type Method = RequestMethod;

const emptyFilters = (): Filters => ({
  methods: new Set<RequestMethod>(),
  statusClasses: new Set<StatusClass>(),
  slowerThanMs: null,
  hosts: new Set<string>(),
});

export interface AppState {
  search: string;
  searchScopes: SearchScopes;
  filters: Filters;
  filterActive: boolean;
  /** Single-select shortcut written into the same filter state. */
  quickChip: 'all' | 'errors' | 'slow' | 'post';
  selectedId: string | null;
  activeTab: DetailTab;
  bodySearch: { query: string; matchIndex: number };
  /** Collapsed JSON paths, keyed by request id. */
  collapsedPaths: Record<string, Set<string>>;
  expandedPaths: Record<string, Set<string>>;
  sheet: null | 'filters' | 'options' | 'export' | 'buffer';
  settings: { bufferLimit: number; redactAuthHeaders: boolean };
  /** Raw payload instead of the JSON tree, on the Response tab. */
  rawResponse: boolean;
  /** Percent-decode the query string in the Full URL card. */
  decodeQuery: boolean;
  /** Substitute `$TOKEN` placeholders in the generated code. */
  redactCode: boolean;
}

export type Action =
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'TOGGLE_SCOPE'; payload: keyof SearchScopes }
  | { type: 'SET_FILTERS'; payload: Filters }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SET_QUICK_CHIP'; payload: AppState['quickChip'] }
  | { type: 'SELECT'; payload: string | null }
  | { type: 'SET_TAB'; payload: DetailTab }
  | { type: 'SET_BODY_SEARCH'; payload: string }
  | { type: 'STEP_BODY_MATCH'; payload: { delta: number; total: number } }
  | {
      type: 'TOGGLE_JSON_PATH';
      payload: { id: string; path: string; collapsed: boolean };
    }
  | {
      type: 'SET_JSON_PATHS';
      payload: { id: string; collapsed: string[]; expanded: string[] };
    }
  | { type: 'SET_SHEET'; payload: AppState['sheet'] }
  | { type: 'SET_SETTING'; payload: Partial<AppState['settings']> }
  | { type: 'TOGGLE_RAW_RESPONSE' }
  | { type: 'TOGGLE_DECODE_QUERY' }
  | { type: 'TOGGLE_REDACT_CODE' }
  /* Legacy v3 actions, still honoured so existing consumers keep working. */
  | {
      type: 'SET_FILTER';
      payload: {
        methods?: Set<RequestMethod>;
        status?: number;
        statusErrors?: boolean;
      };
    }
  | { type: 'CLEAR_FILTER' };

const initialState: AppState = {
  search: '',
  searchScopes: { url: true, headers: false, body: false },
  filters: emptyFilters(),
  filterActive: false,
  quickChip: 'all',
  selectedId: null,
  activeTab: 'overview',
  bodySearch: { query: '', matchIndex: 0 },
  collapsedPaths: {},
  expandedPaths: {},
  sheet: null,
  settings: {
    bufferLimit: LOGGER_MAX_REQUESTS,
    redactAuthHeaders: true,
  },
  rawResponse: false,
  decodeQuery: false,
  redactCode: false,
};

const isFilterActive = (filters: Filters) =>
  filters.methods.size > 0 ||
  filters.statusClasses.size > 0 ||
  filters.slowerThanMs !== null ||
  filters.hosts.size > 0;

const AppContext = React.createContext<
  AppState & { dispatch: Dispatch<Action> }
>({
  ...initialState,
  dispatch: (() => {}) as Dispatch<Action>,
});

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_SEARCH':
      return { ...state, search: action.payload };

    case 'TOGGLE_SCOPE': {
      const scopes = {
        ...state.searchScopes,
        [action.payload]: !state.searchScopes[action.payload],
      };
      // At least one scope must stay on, otherwise search silently
      // matches nothing and looks broken.
      if (!scopes.url && !scopes.headers && !scopes.body) return state;
      return { ...state, searchScopes: scopes };
    }

    case 'SET_FILTERS':
      return {
        ...state,
        filters: action.payload,
        filterActive: isFilterActive(action.payload),
        // Explicit filters supersede whichever quick chip was active.
        quickChip: isFilterActive(action.payload) ? state.quickChip : 'all',
      };

    case 'CLEAR_FILTERS':
    case 'CLEAR_FILTER':
      return {
        ...state,
        filters: emptyFilters(),
        filterActive: false,
        quickChip: 'all',
      };

    case 'SET_QUICK_CHIP': {
      const filters = emptyFilters();
      switch (action.payload) {
        case 'errors':
          filters.statusClasses = new Set<StatusClass>([
            '4xx',
            '5xx',
            'failed',
          ]);
          break;
        case 'slow':
          filters.slowerThanMs = DEFAULT_SLOW_THRESHOLD_MS;
          break;
        case 'post':
          filters.methods = new Set<RequestMethod>(['POST']);
          break;
        default:
          break;
      }
      return {
        ...state,
        quickChip: action.payload,
        filters,
        filterActive: isFilterActive(filters),
      };
    }

    case 'SELECT':
      return {
        ...state,
        selectedId: action.payload,
        // Each detail visit starts on Overview, but tab scroll offsets
        // are preserved while the screen stays mounted.
        activeTab: action.payload ? 'overview' : state.activeTab,
        bodySearch: { query: '', matchIndex: 0 },
        rawResponse: false,
        decodeQuery: false,
      };

    case 'SET_TAB':
      return { ...state, activeTab: action.payload };

    case 'SET_BODY_SEARCH':
      return {
        ...state,
        bodySearch: { query: action.payload, matchIndex: 0 },
      };

    case 'STEP_BODY_MATCH': {
      const { delta, total } = action.payload;
      if (total <= 0) return state;
      const next = (state.bodySearch.matchIndex + delta + total) % total;
      return {
        ...state,
        bodySearch: { ...state.bodySearch, matchIndex: next },
      };
    }

    case 'TOGGLE_JSON_PATH': {
      const { id, path, collapsed } = action.payload;
      const nextCollapsed = new Set(state.collapsedPaths[id] ?? []);
      const nextExpanded = new Set(state.expandedPaths[id] ?? []);

      if (collapsed) {
        nextCollapsed.add(path);
        nextExpanded.delete(path);
      } else {
        nextCollapsed.delete(path);
        nextExpanded.add(path);
      }

      return {
        ...state,
        collapsedPaths: { ...state.collapsedPaths, [id]: nextCollapsed },
        expandedPaths: { ...state.expandedPaths, [id]: nextExpanded },
      };
    }

    case 'SET_JSON_PATHS': {
      const { id, collapsed, expanded } = action.payload;
      return {
        ...state,
        collapsedPaths: { ...state.collapsedPaths, [id]: new Set(collapsed) },
        expandedPaths: { ...state.expandedPaths, [id]: new Set(expanded) },
      };
    }

    case 'SET_SHEET':
      return { ...state, sheet: action.payload };

    case 'SET_SETTING':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    case 'TOGGLE_RAW_RESPONSE':
      return { ...state, rawResponse: !state.rawResponse };

    case 'TOGGLE_DECODE_QUERY':
      return { ...state, decodeQuery: !state.decodeQuery };

    case 'TOGGLE_REDACT_CODE':
      return { ...state, redactCode: !state.redactCode };

    /* ── Legacy v3 shim ─────────────────────────────────────── */
    case 'SET_FILTER': {
      const filters = emptyFilters();
      if (action.payload.methods) filters.methods = action.payload.methods;
      if (action.payload.statusErrors) {
        filters.statusClasses = new Set<StatusClass>(['4xx', '5xx', 'failed']);
      }
      if (action.payload.status) {
        const cls =
          `${Math.floor(action.payload.status / 100)}xx` as StatusClass;
        filters.statusClasses = new Set<StatusClass>([cls]);
      }
      return {
        ...state,
        filters,
        filterActive: isFilterActive(filters),
      };
    }

    default:
      return state;
  }
};

export const useAppContext = () => useContext(AppContext);
export const useDispatch = () => useAppContext().dispatch;

export const AppContextProvider = ({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings?: Partial<AppState['settings']>;
}) => {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    settings: { ...initialState.settings, ...initialSettings },
  });

  const value = useMemo(() => ({ ...state, dispatch }), [state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export { emptyFilters };
export default AppContext;
