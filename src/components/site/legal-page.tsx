import { Markdown } from '@/components/markdown'
import { getContent, getSettings } from '@/lib/content/queries'
import { fillPlaceholders } from '@/lib/utils'

export async function LegalPage({ contentKey, title }: { contentKey: string; title: string }) {
  const [content, settings] = await Promise.all([getContent<{ body: string; reviewed: boolean }>(contentKey), getSettings()])
  const body = fillPlaceholders(content.body, {
    businessName: settings.businessName,
    legalName: settings.legalName || settings.businessName,
    address: settings.address,
    contactEmail: settings.contactEmail,
    phone: settings.phone,
    vatNumber: settings.vatNumber,
    companyRegistration: settings.companyRegistration,
    inquiryRetentionMonths: settings.inquiryRetentionMonths,
  })
  return (
    <div className="shell py-14 lg:py-20">
      <h1 className="text-h1 font-extrabold">{title}</h1>
      <Markdown className="mt-10">{body}</Markdown>
    </div>
  )
}
