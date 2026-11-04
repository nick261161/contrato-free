import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface BaseProps {
  label: string
  error?: string
  hint?: string
}

type InputProps = BaseProps & InputHTMLAttributes<HTMLInputElement>
type TextareaProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>

export function Input({ label, error, hint, className = '', id, ...rest }: InputProps) {
  const inputId = id ?? rest.name

  return (
    <div className={`field ${error ? 'field--invalid' : ''} ${className}`}>
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className="field__control"
        aria-invalid={Boolean(error)}
        {...rest}
      />
      {error ? (
        <span className="field__error">{error}</span>
      ) : hint ? (
        <span className="field__hint">{hint}</span>
      ) : null}
    </div>
  )
}

export function Textarea({ label, error, hint, className = '', id, ...rest }: TextareaProps) {
  const inputId = id ?? rest.name

  return (
    <div className={`field ${error ? 'field--invalid' : ''} ${className}`}>
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      <textarea id={inputId} className="field__control field__control--textarea" {...rest} />
      {error ? (
        <span className="field__error">{error}</span>
      ) : hint ? (
        <span className="field__hint">{hint}</span>
      ) : null}
    </div>
  )
}
