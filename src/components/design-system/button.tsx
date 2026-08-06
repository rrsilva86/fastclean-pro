import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white shadow-glow hover:bg-cyan-500",
  secondary: "bg-secondary text-white hover:bg-teal-500",
  outline: "border border-slate-200 bg-white text-slate-800 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  danger: "bg-danger text-white hover:bg-red-500"
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

export function Button({ children, className = "", variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-black transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
