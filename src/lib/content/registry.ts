/**
 * Editable page copy. Each section is stored in the `content_blocks` table under
 * its key; when nothing is stored yet, the defaults below are used. The admin
 * "Page content" screen renders its forms from these definitions, and the
 * server validates submissions against them.
 *
 * Default copy is a starting draft: it describes how the studio works without
 * claiming clients, results, history or certifications. Review it before launch.
 */
import { z } from 'zod'

export type TextField = { type: 'text'; label: string; max: number; help?: string; optional?: boolean }
export type TextareaField = { type: 'textarea'; label: string; max: number; rows?: number; help?: string; optional?: boolean }
export type MarkdownField = { type: 'markdown'; label: string; max: number; rows?: number; help?: string; optional?: boolean }
export type ListField = { type: 'list'; label: string; itemMax: number; maxItems: number; help?: string }
export type ItemsField = { type: 'items'; label: string; maxItems: number; titleMax: number; bodyMax: number; help?: string }
export type BooleanField = { type: 'boolean'; label: string; help?: string }
export type ContentField = TextField | TextareaField | MarkdownField | ListField | ItemsField | BooleanField

export type ContentItem = { title: string; body: string }

export type SectionDefinition = {
  key: string
  group: 'Homepage' | 'Pages' | 'About' | 'Legal' | 'Search engines'
  label: string
  description?: string
  fields: Record<string, ContentField>
  defaults: Record<string, string | string[] | ContentItem[] | boolean>
}

const seo = (page: string, title: string, description: string): SectionDefinition => ({
  key: `seo.${page}`,
  group: 'Search engines',
  label: `${page[0]!.toUpperCase()}${page.slice(1)} page`,
  description: 'Title and description shown in search results and link previews.',
  fields: {
    title: { type: 'text', label: 'Page title', max: 70, help: 'Aim for 50–60 characters.' },
    description: { type: 'textarea', label: 'Meta description', max: 170, rows: 3, help: 'Aim for 120–160 characters.' },
  },
  defaults: { title, description },
})

const LEGAL_PLACEHOLDER_NOTE =
  'Placeholders such as {{legalName}} are filled from Settings. This text is a template, not legal advice: have it reviewed before launch.'

export const CONTENT_SECTIONS: SectionDefinition[] = [
  {
    key: 'home.hero',
    group: 'Homepage',
    label: 'Hero',
    fields: {
      headline: { type: 'text', label: 'Headline', max: 90 },
      intro: { type: 'textarea', label: 'Introduction', max: 320, rows: 3 },
      primaryCta: { type: 'text', label: 'Primary button', max: 32 },
      secondaryCta: { type: 'text', label: 'Secondary button', max: 32 },
      assurances: { type: 'list', label: 'What every client gets', itemMax: 80, maxItems: 4, help: 'One per line.' },
    },
    defaults: {
      headline: 'Business websites, built properly.',
      intro:
        'RavenWebStudio designs and develops fast, accessible websites for businesses across Europe — and looks after them once they are live.',
      primaryCta: 'Start a project',
      secondaryCta: 'See our work',
      assurances: [
        'A written scope and estimate before work starts',
        'Accessible, mobile-first and search-ready by default',
        'Support and improvements after launch',
      ],
    },
  },
  {
    key: 'home.services',
    group: 'Homepage',
    label: 'Services overview',
    fields: {
      heading: { type: 'text', label: 'Heading', max: 80 },
      intro: { type: 'textarea', label: 'Introduction', max: 300, rows: 3 },
    },
    defaults: {
      heading: 'What we build',
      intro:
        'From a focused landing page to a complete online shop, every project is engineered for speed, accessibility and search from the first line of code.',
    },
  },
  {
    key: 'home.process',
    group: 'Homepage',
    label: 'Process',
    fields: {
      heading: { type: 'text', label: 'Heading', max: 80 },
      intro: { type: 'textarea', label: 'Introduction', max: 300, rows: 3 },
      steps: { type: 'items', label: 'Steps (in order)', maxItems: 7, titleMax: 40, bodyMax: 220 },
    },
    defaults: {
      heading: 'How a project runs',
      intro: 'A clear sequence with a decision point at each step, so you always know what happens next.',
      steps: [
        { title: 'Brief', body: 'We talk through your goals, audience, content and constraints, and agree what success looks like.' },
        { title: 'Proposal', body: 'You receive a written scope, timeline and estimate. Work starts only once you approve it.' },
        { title: 'Design', body: 'We design the key pages and the system behind them, and refine them with your feedback.' },
        { title: 'Build', body: 'We develop and test on real devices, checking accessibility, performance and SEO foundations.' },
        { title: 'Launch and care', body: 'We launch, monitor the site and stay available for maintenance and improvements.' },
      ],
    },
  },
  {
    key: 'home.work',
    group: 'Homepage',
    label: 'Portfolio teaser',
    fields: {
      heading: { type: 'text', label: 'Heading', max: 80 },
      intro: { type: 'textarea', label: 'Introduction', max: 300, rows: 2 },
      emptyTitle: { type: 'text', label: 'Title when no projects are published', max: 80 },
      emptyBody: { type: 'textarea', label: 'Text when no projects are published', max: 300, rows: 3 },
    },
    defaults: {
      heading: 'Selected work',
      intro: "Projects we have delivered, published with our clients' permission.",
      emptyTitle: 'Case studies are on their way',
      emptyBody:
        'We publish projects only once our clients have approved them. Until then, we are glad to walk you through our approach and relevant examples on a call.',
    },
  },
  {
    key: 'home.budgets',
    group: 'Homepage',
    label: 'Project sizes and budgets',
    fields: {
      heading: { type: 'text', label: 'Heading', max: 80 },
      intro: { type: 'textarea', label: 'Introduction', max: 300, rows: 3 },
    },
    defaults: {
      heading: 'Find the right project size',
      intro:
        'Budget shapes scope. These categories show what is typically possible at each level; your proposal is always tailored to your needs.',
    },
  },
  {
    key: 'home.offers',
    group: 'Homepage',
    label: 'Offers teaser',
    fields: {
      heading: { type: 'text', label: 'Heading', max: 80 },
      intro: { type: 'textarea', label: 'Introduction', max: 300, rows: 2 },
    },
    defaults: {
      heading: 'Bundles and offers',
      intro: 'Planning more than one service? Combining them can cost less than ordering each separately.',
    },
  },
  {
    key: 'home.collaboration',
    group: 'Homepage',
    label: 'Collaboration teaser',
    fields: {
      heading: { type: 'text', label: 'Heading', max: 80 },
      intro: { type: 'textarea', label: 'Introduction', max: 300, rows: 3 },
    },
    defaults: {
      heading: 'A development partner for studios, agencies and freelancers',
      intro:
        'We work as a technical partner for teams that need dependable development capacity — under your brand or alongside it.',
    },
  },
  {
    key: 'home.cta',
    group: 'Homepage',
    label: 'Closing call to action',
    fields: {
      heading: { type: 'text', label: 'Heading', max: 80 },
      body: { type: 'textarea', label: 'Text', max: 300, rows: 3 },
      button: { type: 'text', label: 'Button', max: 32 },
    },
    defaults: {
      heading: 'Tell us what you need',
      body: 'Share a few details about your project. We reply personally with next steps, usually starting with a short call.',
      button: 'Start a project',
    },
  },
  {
    key: 'page.services',
    group: 'Pages',
    label: 'Services page',
    fields: {
      heading: { type: 'text', label: 'Heading', max: 80 },
      intro: { type: 'textarea', label: 'Introduction', max: 400, rows: 3 },
      emptyBody: { type: 'textarea', label: 'Text when no services are published', max: 300, rows: 2 },
    },
    defaults: {
      heading: 'Services',
      intro:
        'Pick a single service or combine several. Each one is scoped in writing before work starts, and prices shown are starting points rather than fixed quotes.',
      emptyBody: 'Our service descriptions are being updated. Tell us what you need and we will reply with options.',
    },
  },
  {
    key: 'page.work',
    group: 'Pages',
    label: 'Work page',
    fields: {
      heading: { type: 'text', label: 'Heading', max: 80 },
      intro: { type: 'textarea', label: 'Introduction', max: 400, rows: 3 },
    },
    defaults: {
      heading: 'Work',
      intro: 'A selection of projects we have designed and built. Client names and results appear only with permission.',
    },
  },
  {
    key: 'page.pricing',
    group: 'Pages',
    label: 'Project types and budgets page',
    fields: {
      heading: { type: 'text', label: 'Heading', max: 80 },
      intro: { type: 'textarea', label: 'Introduction', max: 400, rows: 3 },
      note: { type: 'textarea', label: 'Note on estimates', max: 300, rows: 2 },
      emptyBody: { type: 'textarea', label: 'Text when no categories are published', max: 300, rows: 2 },
    },
    defaults: {
      heading: 'Project types and budgets',
      intro:
        'Every business starts from a different place. Use these categories to see what fits your budget, then tell us about your project for a tailored proposal.',
      note: 'Ranges are indicative. Your price depends on scope and is always confirmed in a written proposal before work starts.',
      emptyBody: 'We are finalising our project categories. Tell us your budget in the inquiry form and we will suggest a scope that fits.',
    },
  },
  {
    key: 'page.offers',
    group: 'Pages',
    label: 'Offers page',
    fields: {
      heading: { type: 'text', label: 'Heading', max: 80 },
      intro: { type: 'textarea', label: 'Introduction', max: 400, rows: 3 },
      emptyTitle: { type: 'text', label: 'Title when no offers are running', max: 80 },
      emptyBody: { type: 'textarea', label: 'Text when no offers are running', max: 300, rows: 2 },
    },
    defaults: {
      heading: 'Offers and bundles',
      intro:
        'Existing clients and multi-service projects can qualify for reduced pricing. Conditions are listed with each offer and confirmed in your proposal.',
      emptyTitle: 'No offers are running right now',
      emptyBody: 'Planning several services? Ask us about combining them — we are happy to prepare a tailored proposal.',
    },
  },
  {
    key: 'page.contact',
    group: 'Pages',
    label: 'Contact page',
    fields: {
      heading: { type: 'text', label: 'Heading', max: 80 },
      intro: { type: 'textarea', label: 'Introduction', max: 400, rows: 3 },
      successTitle: { type: 'text', label: 'Confirmation title', max: 80 },
      successBody: { type: 'textarea', label: 'Confirmation text', max: 300, rows: 3 },
      closedNote: { type: 'textarea', label: 'Note when not accepting new projects', max: 300, rows: 2 },
    },
    defaults: {
      heading: 'Start a project',
      intro:
        'Tell us what you are planning. A few details are enough to begin; we will follow up with questions and next steps.',
      successTitle: 'Thank you — your inquiry is with us',
      successBody: 'We will read it carefully and reply personally. Keep your reference number for any follow-up.',
      closedNote: 'We are fully booked for new projects at the moment. You can still send an inquiry and we will reply with our next availability.',
    },
  },
  {
    key: 'about.intro',
    group: 'About',
    label: 'Introduction',
    fields: {
      heading: { type: 'text', label: 'Heading', max: 80 },
      lede: { type: 'textarea', label: 'Lead paragraph', max: 320, rows: 3 },
      body: { type: 'markdown', label: 'Body', max: 4000, rows: 10, help: 'Markdown: **bold**, lists, [links](https://…). HTML is not rendered.' },
    },
    defaults: {
      heading: 'About RavenWebStudio',
      lede: 'A web development studio for businesses across Europe that want a website built properly and looked after over time.',
      body: [
        'We design and develop websites that are fast, accessible and easy to run, and we stay involved after launch.',
        '',
        'We prefer long-term relationships to one-off launches. A website is a working asset: it should keep improving as your business grows, whether that means new pages, an online shop, better search visibility or integrations with the tools you already use.',
      ].join('\n'),
    },
  },
  {
    key: 'about.principles',
    group: 'About',
    label: 'Working principles',
    fields: {
      heading: { type: 'text', label: 'Heading', max: 80 },
      items: { type: 'items', label: 'Principles', maxItems: 8, titleMax: 50, bodyMax: 260 },
    },
    defaults: {
      heading: 'How we work',
      items: [
        { title: 'Clarity before code', body: 'Every project starts with a written scope, so expectations, costs and timelines are agreed up front.' },
        { title: 'Built to last', body: 'Maintainable code, documented decisions and sensible technology choices that do not lock you in.' },
        { title: 'Accessible by default', body: 'We design for keyboard, screen-reader and mobile users from the start, guided by WCAG.' },
        { title: 'Privacy-conscious', body: 'We collect only what a site needs and set up analytics and cookies with European privacy rules in mind.' },
        { title: 'Flexible scope', body: 'From a single landing page to a custom platform, we shape the project around your budget and priorities.' },
      ],
    },
  },
  {
    key: 'about.collaboration',
    group: 'About',
    label: 'Collaboration',
    fields: {
      heading: { type: 'text', label: 'Heading', max: 80 },
      intro: { type: 'textarea', label: 'Introduction', max: 400, rows: 3 },
      closedMessage: { type: 'textarea', label: 'Message when not accepting collaborations', max: 300, rows: 2 },
      button: { type: 'text', label: 'Button', max: 40 },
    },
    defaults: {
      heading: 'Collaborate with us',
      intro:
        'We are open to working with web studios, marketing agencies, designers and freelancers who need a reliable development partner, for single projects or on an ongoing basis.',
      closedMessage: 'We are not taking on new collaborations at the moment. You can still get in touch and we will reply when capacity opens up.',
      button: 'Propose a collaboration',
    },
  },
  {
    key: 'legal.privacy',
    group: 'Legal',
    label: 'Privacy notice',
    description: LEGAL_PLACEHOLDER_NOTE,
    fields: {
      body: { type: 'markdown', label: 'Privacy notice', max: 20000, rows: 24 },
      reviewed: { type: 'boolean', label: 'Reviewed and completed for launch' },
    },
    defaults: {
      reviewed: false,
      body: `This privacy notice explains how {{legalName}} ("we") processes personal data when you use this website.

## Who is responsible

{{legalName}}
{{address}}
E-mail: {{contactEmail}}

## What we collect and why

**Inquiries.** When you send the contact form we process the details you provide (name, e-mail address, optional company, phone number, country, website and your message) to answer your request and, where relevant, prepare a proposal. Legal basis: steps prior to entering into a contract and our legitimate interest in replying to business inquiries (Art. 6(1)(b) and (f) GDPR).

**Technical data.** Our hosting provider processes technical data such as IP addresses in server logs to deliver the website securely. We store a pseudonymised form of IP addresses for a short time to protect forms against abuse.

**Analytics (only with your consent).** If you allow analytics cookies, we use Google Analytics 4 to understand how the site is used. We do not send names, e-mail addresses or form contents to analytics. You can change your choice at any time via "Cookie settings" in the footer. Legal basis: consent (Art. 6(1)(a) GDPR).

## How long we keep data

Inquiries are deleted automatically after {{inquiryRetentionMonths}} months unless they lead to a contract, in which case statutory retention periods apply.

## Recipients and processors

[List your hosting, database, e-mail and analytics providers here, with their location and the safeguards used for transfers outside the EU/EEA.]

## Your rights

You have the right to access, rectify and erase your data, to restrict or object to processing, to data portability and to withdraw consent at any time. To exercise these rights, contact {{contactEmail}}. You also have the right to lodge a complaint with a data protection supervisory authority.

_Last updated: [date]_`,
    },
  },
  {
    key: 'legal.cookies',
    group: 'Legal',
    label: 'Cookie policy',
    description: LEGAL_PLACEHOLDER_NOTE,
    fields: {
      body: { type: 'markdown', label: 'Cookie policy', max: 12000, rows: 18 },
      reviewed: { type: 'boolean', label: 'Reviewed and completed for launch' },
    },
    defaults: {
      reviewed: false,
      body: `This page lists the cookies this website can set. You can change your choice at any time via "Cookie settings" in the footer.

## Strictly necessary

| Cookie | Purpose | Duration |
| --- | --- | --- |
| rws_consent | Remembers your cookie choice | 6 months |

Dashboard users additionally receive a session cookie (\`__Host-rws_session\`) when they sign in; it is deleted when they sign out or after at most 7 days.

## Analytics (only with consent)

If you accept analytics, Google Analytics 4 sets cookies such as \`_ga\` and \`_ga_<ID>\` (up to 2 years) to distinguish visits. These are not set unless you choose "Accept analytics".

_Last updated: [date]_`,
    },
  },
  {
    key: 'legal.notice',
    group: 'Legal',
    label: 'Legal notice (imprint)',
    description: `${LEGAL_PLACEHOLDER_NOTE} Several EU countries (for example Germany and Austria) require a legal notice for business websites.`,
    fields: {
      body: { type: 'markdown', label: 'Legal notice', max: 8000, rows: 14 },
      reviewed: { type: 'boolean', label: 'Reviewed and completed for launch' },
    },
    defaults: {
      reviewed: false,
      body: `## Provider

{{legalName}}
{{address}}

E-mail: {{contactEmail}}
Phone: {{phone}}

## Company details

Registration: {{companyRegistration}}
VAT ID: {{vatNumber}}

## Responsible for content

[Name of the responsible person]`,
    },
  },
  seo('home', 'RavenWebStudio — websites for European businesses', 'RavenWebStudio designs and builds fast, accessible, search-ready websites for businesses across Europe, and supports them after launch.'),
  seo('services', 'Web development services', 'Business websites, landing pages, redesigns, online shops, maintenance, technical SEO and custom integrations — scoped in writing before work starts.'),
  seo('work', 'Work and case studies', 'Selected website projects designed and developed by RavenWebStudio.'),
  seo('pricing', 'Project types and budgets', 'See which kind of website project fits your budget, from focused landing pages to custom builds, and request a tailored proposal.'),
  seo('offers', 'Offers and service bundles', 'Current offers and bundles for new and existing RavenWebStudio clients, with clear conditions.'),
  seo('about', 'About and collaboration', 'How RavenWebStudio works, the principles behind every project, and how agencies, studios and freelancers can collaborate with us.'),
  seo('contact', 'Start a project', 'Tell RavenWebStudio about your website project. Share your goals and budget and we will reply personally with next steps.'),
]

export const CONTENT_KEYS = CONTENT_SECTIONS.map((s) => s.key)

export function sectionDefinition(key: string): SectionDefinition | undefined {
  return CONTENT_SECTIONS.find((s) => s.key === key)
}

/** Builds the server-side validator for a section from its field definitions. */
export function sectionSchema(def: SectionDefinition) {
  const shape: Record<string, z.ZodType> = {}
  for (const [name, field] of Object.entries(def.fields)) {
    switch (field.type) {
      case 'text':
      case 'textarea':
      case 'markdown': {
        const base = z.string().trim().max(field.max, `${field.label}: at most ${field.max} characters.`)
        shape[name] = field.optional ? base : base.min(1, `${field.label} is required.`)
        break
      }
      case 'list':
        shape[name] = z
          .array(z.string().trim().min(1).max(field.itemMax, `${field.label}: each line at most ${field.itemMax} characters.`))
          .max(field.maxItems, `${field.label}: at most ${field.maxItems} lines.`)
        break
      case 'items':
        shape[name] = z
          .array(
            z.object({
              title: z.string().trim().min(1, `${field.label}: every item needs a title.`).max(field.titleMax),
              body: z.string().trim().max(field.bodyMax),
            }),
          )
          .max(field.maxItems, `${field.label}: at most ${field.maxItems} items.`)
        break
      case 'boolean':
        shape[name] = z.boolean()
        break
    }
  }
  return z.object(shape)
}

/** Merges stored data over defaults, dropping anything that no longer validates. */
export function resolveSection<T = Record<string, unknown>>(def: SectionDefinition, stored: unknown): T {
  const merged: Record<string, unknown> = { ...def.defaults }
  if (stored && typeof stored === 'object') {
    const schema = sectionSchema(def)
    for (const [name, value] of Object.entries(stored as Record<string, unknown>)) {
      if (!(name in def.fields)) continue
      const fieldSchema = schema.shape[name]
      const parsed = fieldSchema?.safeParse(value)
      if (parsed?.success) merged[name] = parsed.data
    }
  }
  return merged as T
}
