// Simple table primitives.
export function Table({ columns, children }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#1F3D5C]/10 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[#61707A] border-b border-[#1F3D5C]/10">
            {columns.map((c) => (
              <th key={c} className="px-4 py-3 font-semibold whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children }) {
  return <tr className="border-b border-[#1F3D5C]/5 last:border-0 hover:bg-[#F5EEE2]/40">{children}</tr>;
}

export function Cell({ children, className = '' }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}
