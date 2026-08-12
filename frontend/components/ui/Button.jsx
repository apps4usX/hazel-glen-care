// Button — brand-styled, variant + loading support.
export default function Button({
  children, variant = 'primary', type = 'button', loading = false, disabled = false, className = '', ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl px-4 py-2.5 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-[#3E9C8E] text-white hover:bg-[#2F7D71]',
    navy: 'bg-[#1F3D5C] text-white hover:bg-[#14293D]',
    outline: 'border-2 border-[#1F3D5C] text-[#1F3D5C] hover:bg-[#1F3D5C] hover:text-white',
    ghost: 'text-[#1F3D5C] hover:bg-[#E4F0EC]',
    danger: 'bg-[#C0453B] text-white hover:bg-[#a53a31]',
  };
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${base} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
      )}
      {children}
    </button>
  );
}
