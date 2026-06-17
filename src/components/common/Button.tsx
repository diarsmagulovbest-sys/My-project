import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

export function Button({ children, className = '', variant = 'primary', ...props }: ButtonProps) {
  const classNames = ['button', `button-${variant}`, className].filter(Boolean).join(' ');

  return (
    <button className={classNames} type="button" {...props}>
      {children}
    </button>
  );
}
