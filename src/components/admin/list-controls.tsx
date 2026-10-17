import { ActionButton } from './action-form'
import { moveAction, setStatusAction } from '@/app/admin/(protected)/common-actions'

export function MoveButtons({ table, id, first, last }: { table: string; id: string; first: boolean; last: boolean }) {
  return (
    <span className="inline-flex gap-1">
      {!first && <ActionButton action={moveAction} hidden={{ table, id, direction: 'up' }} label={<span aria-label="Move up">↑</span>} title="Move up" />}
      {!last && <ActionButton action={moveAction} hidden={{ table, id, direction: 'down' }} label={<span aria-label="Move down">↓</span>} title="Move down" />}
    </span>
  )
}

export function PublishToggle({ table, id, status }: { table: string; id: string; status: string }) {
  return status === 'published' ? (
    <ActionButton action={setStatusAction} hidden={{ table, id, status: 'draft' }} label="Unpublish" />
  ) : (
    <ActionButton action={setStatusAction} hidden={{ table, id, status: 'published' }} label="Publish" variant="primary" />
  )
}
