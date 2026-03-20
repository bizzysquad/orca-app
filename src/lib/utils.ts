// Formatting utilities
export const fmt = (a: number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(a||0);

export const fmtD = (d: string) => {
  if(!d) return '';
  const dt = new Date(d+'T00:00:00');
  return dt.toLocaleDateString('en-US',{month:'short',day:'numeric'});
};

// Date utilities
export const today = () => new Date().toISOString().split('T')[0];

export const addD = (d: string, n: number) => {
  const dt = new Date(d+'T00:00:00');
  dt.setDate(dt.getDate()+n);
  return dt.toISOString().split('T')[0];
};

export const daysTo = (d: string) => {
  if(!d) return Infinity;
  const n = new Date();
  n.setHours(0,0,0,0);
  return Math.ceil((new Date(d+'T00:00:00').getTime()-n.getTime())/(864e5));
};

// ID and math utilities
export const gid = () => Math.random().toString(36).substr(2,9)+Date.now().toString(36);

export const pct = (c: number, t: number) => t>0?Math.max(0,Math.min(100,Math.round((c/t)*100))):0;

// Sanitization
export const sanitize = (s: string) => {
  if(typeof s !== 'string') return '';
  return s.replace(/[&<>"'/]/g, (c: string) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#47;'}[c]||c)).substring(0,500);
};

export const sanitizeNum = (v: string | number, min=-Infinity, max=Infinity) => {
  const n = parseFloat(String(v));
  if(isNaN(n)) return 0;
  return Math.min(max,Math.max(min,n));
};

// Financial calculation utilities
export const f2w = (a: number, f: string) => {
  const m: Record<string,number> = {
    weekly:1,
    biweekly:0.5,
    semimonthly:24/52,
    monthly:12/52,
    quarterly:4/52,
    yearly:1/52
  };
  return a*(m[f]||12/52);
};

export const calcIncome = (s: any[]) =>
  s.filter(x=>x.active!==false).reduce((r: number,x: any)=>r+f2w(x.amount,x.freq),0);

export const calcBillRes = (b: any[]) =>
  b.filter(x=>x.status!=='paid').reduce((r: number,x: any)=>r+f2w(x.amount,x.freq||'monthly'),0);

export function calcAlloc(srcs: any[], bills: any[], goals: any[]) {
  const inc = calcIncome(srcs);
  const br = calcBillRes(bills);
  const sr = goals.filter((g: any)=>g.active!==false).reduce((s: number,g: any)=>s+(g.cType==='fixed'?(g.cVal||0):(inc*(g.cVal||0)/100)),0);
  const sts = Math.max(0,inc-br-sr);
  const short = Math.max(0,(br+sr)-inc);
  return {inc,br,sr,sts,daily:sts/7,short};
}

export const getPaycheckAmount = (user: any, income: any[]) => {
  const weeklyInc = calcIncome(income);
  const m: Record<string,number> = {
    weekly:1,
    biweekly:2,
    semimonthly:52/24,
    monthly:52/12
  };
  return weeklyInc * (m[user.payFreq]||2);
};

// ── Aliases (descriptive names used across the app) ──
export const formatCurrency = fmt;
export const formatDate = fmtD;
export const formatDateLong = (d: string) => {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};
export const daysUntil = daysTo;
export const percentage = pct;
export const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');
export const getRelativeTime = (d: string) => {
  if (!d) return '';
  const now = new Date();
  const date = new Date(d);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return fmtD(d.split('T')[0]);
};
export const calculateWeeklyIncome = calcIncome;
export const calculateWeeklyAllocation = calcAlloc;
export const calculateBillReserve = calcBillRes;
export const frequencyToWeekly = f2w;
export const generateId = gid;
export const getInitials = (name: string) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
};
