'use client'

import { useId, useState, type ReactNode } from 'react'
import { cx } from '@/lib/utils'
import { useFieldError } from './action-form'

type Common = {
  name: string
  label: string
  hint?: ReactNode
  required?: boolean
  className?: string
}

function Wrapper({ id, label, hint, error, required, className, children }: Common & { id: string; error?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {hint && !error && (
        <span id={`${id}-hint`} className="field-hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      )}
    </div>
  )
}

function useField(name: string) {
  const id = `f-${useId()}-${name}`
  const error = useFieldError(name)
  return { id, error }
}

export function TextField({
  defaultValue,
  type = 'text',
  maxLength,
  placeholder,
  autoComplete,
  inputMode,
  ...common
}: Common & {
  defaultValue?: string | number | null
  type?: 'text' | 'email' | 'url' | 'password' | 'date' | 'number' | 'search'
  maxLength?: number
  placeholder?: string
  autoComplete?: string
  inputMode?: 'text' | 'decimal' | 'numeric' | 'email' | 'url'
}) {
  const { id, error } = useField(common.name)
  return (
    <Wrapper {...common} id={id} error={error}>
      <input
        id={id}
        name={common.name}
        type={type}
        defaultValue={defaultValue ?? ''}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        required={common.required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : common.hint ? `${id}-hint` : undefined}
        className="input"
      />
    </Wrapper>
  )
}

export function TextAreaField({
  defaultValue,
  rows = 4,
  maxLength,
  mono,
  ...common
}: Common & { defaultValue?: string | null; rows?: number; maxLength?: number; mono?: boolean }) {
  const { id, error } = useField(common.name)
  return (
    <Wrapper {...common} id={id} error={error}>
      <textarea
        id={id}
        name={common.name}
        rows={rows}
        defaultValue={defaultValue ?? ''}
        maxLength={maxLength}
        required={common.required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : common.hint ? `${id}-hint` : undefined}
        className={cx('input', mono && 'font-mono text-[0.875rem]')}
      />
    </Wrapper>
  )
}

export function SelectField({
  defaultValue,
  options,
  ...common
}: Common & { defaultValue?: string | null; options: { value: string; label: string }[] }) {
  const { id, error } = useField(common.name)
  return (
    <Wrapper {...common} id={id} error={error}>
      <select
        id={id}
        name={common.name}
        defaultValue={defaultValue ?? ''}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : common.hint ? `${id}-hint` : undefined}
        className="input"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrapper>
  )
}

export function CheckboxField({ name, label, hint, defaultChecked, className }: { name: string; label: ReactNode; hint?: ReactNode; defaultChecked?: boolean; className?: string }) {
  const id = `f-${useId()}-${name}`
  const error = useFieldError(name)
  return (
    <div className={className}>
      <label htmlFor={id} className="flex items-start gap-3">
        <input id={id} type="checkbox" name={name} defaultChecked={defaultChecked} className="check" aria-describedby={hint ? `${id}-hint` : undefined} />
        <span className="font-semibold">{label}</span>
      </label>
      {hint && (
        <span id={`${id}-hint`} className="field-hint pl-8">
          {hint}
        </span>
      )}
      {error && <span className="field-error pl-8">{error}</span>}
    </div>
  )
}

export function CheckboxListField({
  name,
  label,
  options,
  defaultValues = [],
  hint,
  className,
}: {
  name: string
  label: string
  options: { value: string; label: string }[]
  defaultValues?: string[]
  hint?: ReactNode
  className?: string
}) {
  const error = useFieldError(name)
  const selected = new Set(defaultValues)
  return (
    <fieldset className={className}>
      <legend className="field-label">{label}</legend>
      {options.length === 0 ? (
        <p className="field-hint">Nothing to choose from yet.</p>
      ) : (
        <div className="grid max-h-64 gap-1.5 overflow-y-auto rounded-[var(--radius-control)] border border-line p-3 sm:grid-cols-2">
          {options.map((o) => (
            <label key={o.value} className="flex items-start gap-2.5 text-[0.9375rem]">
              <input type="checkbox" name={name} value={o.value} defaultChecked={selected.has(o.value)} className="check" />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      )}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </fieldset>
  )
}

export function RadioField({
  name,
  label,
  options,
  defaultValue,
  hint,
  className,
}: {
  name: string
  label: string
  options: { value: string; label: string; hint?: string }[]
  defaultValue?: string
  hint?: ReactNode
  className?: string
}) {
  const error = useFieldError(name)
  return (
    <fieldset className={className}>
      <legend className="field-label">{label}</legend>
      <div className="space-y-2">
        {options.map((o) => (
          <label key={o.value} className="flex items-start gap-2.5">
            <input type="radio" name={name} value={o.value} defaultChecked={defaultValue === o.value} className="check" />
            <span>
              <span className="font-semibold">{o.label}</span>
              {o.hint && <span className="block text-sm text-slate">{o.hint}</span>}
            </span>
          </label>
        ))}
      </div>
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </fieldset>
  )
}

/** Repeating title/body pairs (process steps, principles). */
export function ItemsField({
  name,
  label,
  defaultItems,
  maxItems,
  titleMax,
  bodyMax,
}: {
  name: string
  label: string
  defaultItems: { title: string; body: string }[]
  maxItems: number
  titleMax: number
  bodyMax: number
}) {
  const [items, setItems] = useState(() => defaultItems.map((item, i) => ({ ...item, key: `${i}-${item.title}` })))
  const error = useFieldError(name)
  const move = (index: number, delta: number) =>
    setItems((list) => {
      const next = [...list]
      const target = index + delta
      if (target < 0 || target >= next.length) return list
      ;[next[index], next[target]] = [next[target]!, next[index]!]
      return next
    })
  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <input type="hidden" name={name} value={JSON.stringify(items.map(({ title, body }) => ({ title, body })))} />
      <ol className="space-y-3">
        {items.map((item, i) => (
          <li key={item.key} className="rounded-[var(--radius-control)] border border-line bg-paper p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate">Item {i + 1}</span>
              <span className="flex gap-1">
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move item ${i + 1} up`}>
                  ↑
                </button>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move item ${i + 1} down`}>
                  ↓
                </button>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => setItems((list) => list.filter((_, j) => j !== i))} aria-label={`Remove item ${i + 1}`}>
                  Remove
                </button>
              </span>
            </div>
            <label className="field-label mt-3" htmlFor={`${name}-${item.key}-t`}>
              Title
            </label>
            <input
              id={`${name}-${item.key}-t`}
              className="input"
              maxLength={titleMax}
              value={item.title}
              onChange={(e) => setItems((list) => list.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
            />
            <label className="field-label mt-3" htmlFor={`${name}-${item.key}-b`}>
              Text
            </label>
            <textarea
              id={`${name}-${item.key}-b`}
              className="input min-h-20"
              rows={3}
              maxLength={bodyMax}
              value={item.body}
              onChange={(e) => setItems((list) => list.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))}
            />
          </li>
        ))}
      </ol>
      {items.length < maxItems && (
        <button type="button" className="btn btn-quiet btn-sm mt-3" onClick={() => setItems((list) => [...list, { title: '', body: '', key: `new-${Date.now()}` }])}>
          Add item
        </button>
      )}
      {error && <span className="field-error">{error}</span>}
    </fieldset>
  )
}

/** Shows a validation message that is not attached to a single input. */
export function FieldError({ name }: { name: string }) {
  const error = useFieldError(name)
  return error ? <p className="field-error">{error}</p> : null
}
