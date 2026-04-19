interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({ children, variant = "primary", size = "md", className = "", ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg font-body font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = { sm: "text-sm px-4 py-2", md: "text-base px-6 py-3", lg: "text-lg px-8 py-4" };
  const variants = {
    primary: "bg-accent text-white hover:bg-accent-hover shadow-glow-sm hover:shadow-glow-accent active:scale-[0.98]",
    ghost: "border border-border text-text-secondary hover:text-text-primary hover:border-border-strong bg-transparent",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
