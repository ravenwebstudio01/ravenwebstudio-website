'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from 'react'
import type { ActionResult } from '@/lib/admin/action-result'
import { cx } from '@/lib/utils'

type FormCtx = { errors: Record<string, string>; pending: boolean }
const FormContext = createContext<FormCtx>({ errors: {}, pending: false })

export function useFieldError(name: string): string | undefined {
  return useContext(FormContext).errors[name]
}

export function useFormPending(): boolean {
  return useContext(FormContext).pending
}

/**
 * Dashboard form: submits to a server action without resetting the user's
 * input, shows the server's validation messages next to fields, and refreshes
 * the page data after a successful save.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirmMessage,
  onSuccess,
}: {
  action: (formData: FormData) => Promise<ActionResult>
  children: ReactNode
  className?: string
  resetOnSuccess?: boolean
  confirmMessage?: string
  onSuccess?: (result: ActionResult & { ok: true }) => void
}) {
  const router = useRouter()
  const [result, setResult] = useState<ActionResult | null>(null)
  const [pending, startTransition] = useTransition()
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (result && !result.ok) statusRef.current?.focus()
  }, [result])

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (confirmMessage && !window.confirm(confirmMessage)) return
    const form = event.currentTarget
    const formData = new FormData(form)
    startTransition(async () => {
      const res = await action(formData)
      setResult(res)
      if (res.ok) {
        if (resetOnSuccess) form.reset()
        onSuccess?.(res)
        if (res.redirectTo) router.push(res.redirectTo)
        else router.refresh()
      }
    })
  }

  return (
    <FormContext.Provider value={{ errors: result && !result.ok ? (result.fieldErrors ?? {}) : {}, pending }}>
      <form onSubmit={onSubmit} noValidate className={className}>
        <div ref={statusRef} tabIndex={-1} className="outline-none" aria-live="polite">
          {result && (
            <div
              role={result.ok ? 'status' : 'alert'}
              className={cx(
                'mb-5 rounded-[var(--radius-control)] border-l-4 px-4 py-3 text-[0.9375rem] font-semibold',
                result.ok ? 'border-success bg-success-soft text-success' : 'border-danger bg-danger-soft text-danger',
              )}
            >
              {result.ok ? (result.message ?? 'Saved.') : result.message}
            </div>
          )}
        </div>
        {children}
      </form>
    </FormContext.Provider>
  )
}

export function SubmitButton({ children, variant = 'primary', className }: { children: ReactNode; variant?: 'primary' | 'danger' | 'quiet'; className?: string }) {
  const pending = useFormPending()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={cx('btn btn-sm', variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : 'btn-quiet', className)}
    >
      {pending ? 'Working…' : children}
    </button>
  )
}

/** A one-button form (publish, delete, move...). */
export function ActionButton({
  action,
  label,
  variant = 'quiet',
  confirmMessage,
  hidden,
  className,
  title,
}: {
  action: (formData: FormData) => Promise<ActionResult>
  label: ReactNode
  variant?: 'primary' | 'danger' | 'quiet'
  confirmMessage?: string
  hidden?: Record<string, string>
  className?: string
  title?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        title={title}
        disabled={pending}
        className={cx('btn btn-sm', variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : 'btn-quiet', className)}
        onClick={() => {
          if (confirmMessage && !window.confirm(confirmMessage)) return
          const fd = new FormData()
          for (const [k, v] of Object.entries(hidden ?? {})) fd.set(k, v)
          startTransition(async () => {
            const res = await action(fd)
            if (!res.ok) setError(res.message)
            else {
              setError(null)
              if (res.redirectTo) router.push(res.redirectTo)
              else router.refresh()
            }
          })
        }}
      >
        {pending ? '…' : label}
      </button>
      {error && (
        <span role="alert" className="mt-1 text-xs font-semibold text-danger">
          {error}
        </span>
      )}
    </span>
  )
}
