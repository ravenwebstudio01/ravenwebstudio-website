# Analytics (Google Analytics 4)

Analytics is **off** until a GA4 measurement ID is entered in *Dashboard → Site settings* (or `NEXT_PUBLIC_GA_MEASUREMENT_ID`). Even then, nothing is loaded until the visitor accepts analytics cookies.

## Consent model ("basic" consent mode)

1. First visit: a banner offers **Accept** and **Reject** with equal prominence. No Google script is requested and no analytics cookie is set before a choice.
2. **Reject**: the choice is stored in the `rws_consent` cookie (6 months). Google is never contacted.
3. **Accept**: the GA4 library loads with `analytics_storage: granted` and `ad_storage`, `ad_user_data`, `ad_personalization` **denied**; Google signals and ad personalisation are disabled.
4. **Change of mind**: *Cookie settings* in the footer reopens the banner. Withdrawing consent deletes the `_ga*` cookies and stops further measurement on the next page load.
5. The banner is keyboard-accessible, labelled, and does not block the page.

Because the script is not loaded without consent, GA4 receives no cookieless pings (this is "basic", not "advanced", consent mode). Visits from people who reject are therefore not counted at all.

## GA4 property set-up (your action)

1. Create a GA4 property and a web data stream for the production domain.
2. *Admin → Data collection and modification → Data retention*: choose **2 months** unless you need longer.
3. *Admin → Data collection*: keep **Google signals off**; leave ads personalisation disabled.
4. *Admin → Data streams → Enhanced measurement*: you may turn off "Form interactions" (the site sends its own form events) and keep page views off for history changes (the site sends `page_view` itself on navigation).
5. Copy the measurement ID (`G-XXXXXXX`) into *Site settings*.
6. *Admin → Events*: once `generate_lead` has been received, mark it as a **key event**.
7. Sign Google's data processing terms in *Admin → Account settings*.

## Event catalogue

All events are sent through one helper (`src/lib/analytics/client.ts`) that does nothing without consent. Elements carry `data-track` attributes so the markup documents what is measured.

| Event | When | Parameters |
| --- | --- | --- |
| `page_view` | Every page, including client-side navigation | `page_path`, `page_location`, `page_title` (query strings removed) |
| `cta_click` | Primary calls to action (header, hero, page CTAs) | `cta_id`, `location` |
| `service_inquiry_click` | "Ask about this service" | `service_slug` |
| `budget_tier_select` | Budget category CTA | `tier_slug`, `location` |
| `offer_cta_click` | Offer CTA | `offer_slug` |
| `collaboration_cta_click` | Collaboration CTA | `location` |
| `project_view` | Portfolio project page viewed | `project_slug` |
| `inquiry_form_start` | First interaction with the inquiry form | — |
| `inquiry_form_submit` | Submit pressed (before server validation) | — |
| `inquiry_form_error` | Submission rejected | `error_type` (`validation` or `server`) |
| `estimate_request` | Indicative estimate calculated | `service_count`, `has_offer` |
| `generate_lead` | Inquiry stored successfully — **key event** | `inquiry_type`, `client_status`, `service_count`, `has_budget` |

**Never sent:** names, e-mail addresses, phone numbers, company names, free text, inquiry references, offer codes or prices. `sanitiseParams` drops values containing `@`, runs of six or more digits, or more than 100 characters.

## Useful reports

- *Reports → Engagement → Events*: CTA clicks by `location`.
- Funnel exploration: `page_view` (/contact) → `inquiry_form_start` → `inquiry_form_submit` → `generate_lead`.
- Register `cta_id`, `location`, `service_slug`, `inquiry_type` as custom dimensions (*Admin → Custom definitions*) to use them in reports.

## Search Console

Enter the verification token in *Site settings* (rendered as a `google-site-verification` meta tag), verify the property, then submit `https://<your-domain>/sitemap.xml`. Search Console sets no cookies on the site and needs no consent.

## Changing analytics

Adding any other tool (pixels, heatmaps, chat widgets) requires: approval, a consent-banner update, a cookie-policy and privacy-notice update, and a CSP change in `src/proxy.ts`.
