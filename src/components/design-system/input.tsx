import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ className = "", label, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="grid min-w-0 gap-1.5 text-xs font-bold text-slate-600" htmlFor={inputId}>
      {label}
      <input
        id={inputId}
        className={`h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-cyan-100 ${className}`}
        {...props}
      />
    </label>
  );
}
