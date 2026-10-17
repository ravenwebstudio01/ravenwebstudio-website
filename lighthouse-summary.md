| Page | Perf | A11y | Best practices | SEO | LCP | CLS | TBT | Failing binary audits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| contact-desktop | 100 | 100 | 100 | 100 | 0.6 s | 0 | 0 ms | bf-cache |
| contact-mobile | 93 | 100 | 100 | 100 | 3.0 s | 0 | 160 ms | bf-cache |
| home-desktop | 100 | 100 | 100 | 100 | 0.6 s | 0 | 0 ms | bf-cache |
| home-mobile | 97 | 100 | 100 | 100 | 2.5 s | 0 | 70 ms | bf-cache |
| pricing-desktop | 100 | 100 | 100 | 100 | 0.6 s | 0 | 0 ms | bf-cache |
| pricing-mobile | 99 | 100 | 100 | 100 | 2.1 s | 0 | 70 ms | bf-cache |
| services-desktop | 100 | 100 | 100 | 100 | 0.6 s | 0 | 0 ms | bf-cache |
| services-mobile | 99 | 100 | 100 | 100 | 1.9 s | 0 | 70 ms | bf-cache |
| work-desktop | 100 | 100 | 100 | 100 | 0.6 s | 0 | 0 ms | bf-cache |
| work-mobile | 96 | 100 | 100 | 100 | 2.6 s | 0 | 70 ms | bf-cache |

## Details of failing pass/fail audits

### contact-desktop

- **bf-cache** (Page prevented back/forward cache restoration) — 2 failure reasons
  - Pages whose main resource has cache-control:no-store cannot enter back/forward cache. — {"frameUrl":"http://localhost:3000/contact"}
  - Back/forward cache is disabled because some JavaScript network request received resource with Cache-Control: no-store header. — {"frameUrl":"http://localhost:3000/contact"}

### contact-mobile

- **bf-cache** (Page prevented back/forward cache restoration) — 2 failure reasons
  - Pages whose main resource has cache-control:no-store cannot enter back/forward cache. — {"frameUrl":"http://localhost:3000/contact"}
  - Back/forward cache is disabled because some JavaScript network request received resource with Cache-Control: no-store header. — {"frameUrl":"http://localhost:3000/contact"}

### home-desktop

- **bf-cache** (Page prevented back/forward cache restoration) — 2 failure reasons
  - Pages whose main resource has cache-control:no-store cannot enter back/forward cache. — {"frameUrl":"http://localhost:3000/"}
  - Back/forward cache is disabled because some JavaScript network request received resource with Cache-Control: no-store header. — {"frameUrl":"http://localhost:3000/"}

### home-mobile

- **bf-cache** (Page prevented back/forward cache restoration) — 2 failure reasons
  - Pages whose main resource has cache-control:no-store cannot enter back/forward cache. — {"frameUrl":"http://localhost:3000/"}
  - Back/forward cache is disabled because some JavaScript network request received resource with Cache-Control: no-store header. — {"frameUrl":"http://localhost:3000/"}

### pricing-desktop

- **bf-cache** (Page prevented back/forward cache restoration) — 2 failure reasons
  - Pages whose main resource has cache-control:no-store cannot enter back/forward cache. — {"frameUrl":"http://localhost:3000/pricing"}
  - Back/forward cache is disabled because some JavaScript network request received resource with Cache-Control: no-store header. — {"frameUrl":"http://localhost:3000/pricing"}

### pricing-mobile

- **bf-cache** (Page prevented back/forward cache restoration) — 2 failure reasons
  - Pages whose main resource has cache-control:no-store cannot enter back/forward cache. — {"frameUrl":"http://localhost:3000/pricing"}
  - Back/forward cache is disabled because some JavaScript network request received resource with Cache-Control: no-store header. — {"frameUrl":"http://localhost:3000/pricing"}

### services-desktop

- **bf-cache** (Page prevented back/forward cache restoration) — 2 failure reasons
  - Pages whose main resource has cache-control:no-store cannot enter back/forward cache. — {"frameUrl":"http://localhost:3000/services"}
  - Back/forward cache is disabled because some JavaScript network request received resource with Cache-Control: no-store header. — {"frameUrl":"http://localhost:3000/services"}

### services-mobile

- **bf-cache** (Page prevented back/forward cache restoration) — 2 failure reasons
  - Pages whose main resource has cache-control:no-store cannot enter back/forward cache. — {"frameUrl":"http://localhost:3000/services"}
  - Back/forward cache is disabled because some JavaScript network request received resource with Cache-Control: no-store header. — {"frameUrl":"http://localhost:3000/services"}

### work-desktop

- **bf-cache** (Page prevented back/forward cache restoration) — 2 failure reasons
  - Pages whose main resource has cache-control:no-store cannot enter back/forward cache. — {"frameUrl":"http://localhost:3000/work"}
  - Back/forward cache is disabled because some JavaScript network request received resource with Cache-Control: no-store header. — {"frameUrl":"http://localhost:3000/work"}

### work-mobile

- **bf-cache** (Page prevented back/forward cache restoration) — 2 failure reasons
  - Pages whose main resource has cache-control:no-store cannot enter back/forward cache. — {"frameUrl":"http://localhost:3000/work"}
  - Back/forward cache is disabled because some JavaScript network request received resource with Cache-Control: no-store header. — {"frameUrl":"http://localhost:3000/work"}
