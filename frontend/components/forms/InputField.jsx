// Labelled input.
export default function InputField({ label, type = 'text', error, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="block mb-1 text-sm font-semibold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>
          {label}
        </span>
      )}
      <input
        type={type}
        className="w-full rounded-xl border border-[#1F3D5C]/15 bg-[#FDFCF9] px-3 py-2.5 text-sm text-[#33424E] outline-none focus:border-[#3E9C8E]"
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-[#b23b30]">{error}</span>}
    </label>
  );
}
