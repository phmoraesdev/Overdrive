const CORES = {
  slate: 'bg-slate-200 text-slate-700',
  amber: 'bg-amber-100 text-amber-800',
  emerald: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
};

function Badge({ children, cor = 'slate' }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CORES[cor]}`}>{children}</span>
  );
}

export default Badge;
