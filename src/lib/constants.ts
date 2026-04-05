export const BILL_CATS = ['Rent/Mortgage','Utilities','Phone/Internet','Insurance','Debt/Credit Cards','Subscriptions','Car Note','Childcare','Medical','Other'];

export const EXP_CATS = ['Groceries','Gas/Transport','Dining Out','Entertainment','Shopping','Medical','Household','Personal Care','Misc'];

export const PAY_FREQ = [{v:'weekly',l:'Weekly'},{v:'biweekly',l:'Biweekly'},{v:'semimonthly',l:'Twice/Month'},{v:'monthly',l:'Monthly'}];

export const PAY_CYCLES = [{v:'standard',l:'Standard'},{v:'offset',l:'Offset Week'},{v:'1st_15th',l:'1st & 15th'},{v:'last_day',l:'Last Day of Month'}];

export const SAVE_PRESETS = ['Emergency Fund','Vacation','Moving Fund','Car Fund','Holiday Fund','Custom'];

export const CREDIT_RANGES = [
  {min:800,max:850,l:'Exceptional',c:'#4ade80'},
  {min:740,max:799,l:'Very Good',c:'#86efac'},
  {min:670,max:739,l:'Good',c:'#fbbf24'},
  {min:580,max:669,l:'Fair',c:'#fb923c'},
  {min:300,max:579,l:'Poor',c:'#f87171'}
];

// ── Aliases (descriptive names used across the app) ──
export const BILL_CATEGORIES = BILL_CATS;
export const EXPENSE_CATEGORIES = EXP_CATS;
export const SAVINGS_PRESETS = SAVE_PRESETS;
export const PAY_FREQUENCIES = PAY_FREQ.map(f => ({ value: f.v, label: f.l }));
// PAY_CYCLES already exported above

// App-level constants
export const FOUNDING_USER_LIMIT = 500;
export const TRIAL_DAYS = 14;

// Check-spitter split configurations
export const SPLIT_4WAY = {
  id: '4way',
  label: '4-Way Split',
  categories: [
    { key: 'bills', label: 'Bills & Fixed', color: '#EF4444', percent: 50 },
    { key: 'savings', label: 'Savings', color: '#22C55E', percent: 20 },
    { key: 'flex', label: 'Flexible Spending', color: '#D4AF37', percent: 20 },
    { key: 'emergency', label: 'Emergency Fund', color: '#3B82F6', percent: 10 },
  ],
};

export const SPLIT_6WAY = {
  id: '6way',
  label: '6-Way Split',
  categories: [
    { key: 'bills', label: 'Bills & Fixed', color: '#EF4444', percent: 40 },
    { key: 'savings', label: 'Savings', color: '#22C55E', percent: 15 },
    { key: 'flex', label: 'Flexible Spending', color: '#D4AF37', percent: 15 },
    { key: 'emergency', label: 'Emergency Fund', color: '#3B82F6', percent: 10 },
    { key: 'invest', label: 'Investing', color: '#8B5CF6', percent: 10 },
    { key: 'giving', label: 'Giving/Fun', color: '#EC4899', percent: 10 },
  ],
};
