// Hazel Glen Care — brand design tokens (shared across the app).
// Mirrors the marketing site: navy primary, teal accent, warm cream.
export const theme = {
  colors: {
    navy: '#1F3D5C',
    navy900: '#14293D',
    teal: '#3E9C8E',
    teal600: '#2F7D71',
    tealSoft: '#E4F0EC',
    gold: '#B4893C',
    cream: '#F5EEE2',
    paper: '#FFFFFF',
    ink: '#33424E',
    muted: '#61707A',
    line: 'rgba(31,61,92,.12)',
  },
  radius: { sm: '10px', md: '16px', lg: '22px' },
  font: {
    head: '"Poppins", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif',
  },
};

// Status → badge tone mapping used across tables.
export const STATUS_TONE = {
  OPEN: 'teal', DRAFT: 'muted', PARTIALLY_FILLED: 'gold', FILLED: 'teal',
  IN_PROGRESS: 'gold', COMPLETED: 'green', CANCELLED: 'red',
  PENDING: 'gold', ACTIVE: 'teal', SUSPENDED: 'red',
  VERIFIED: 'green', EXPIRED: 'red', REJECTED: 'red',
  RECEIVED: 'muted', SHORTLISTED: 'teal', HIRED: 'green', WITHDRAWN: 'muted',
};

export default theme;
