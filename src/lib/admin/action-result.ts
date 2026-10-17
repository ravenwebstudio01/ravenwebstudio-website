export type ActionResult =
  | { ok: true; message?: string; redirectTo?: string; data?: Record<string, unknown> }
  | { ok: false; message: string; fieldErrors?: Record<string, string> }

export class ValidationError extends Error {
  constructor(
    message: string,
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}
