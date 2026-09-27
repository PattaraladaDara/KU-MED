# Figma implementation status

Source file: `8hF0A06GvPJzUeQcNydWgy`, canvas `0:1`.

## Implemented portion

### Clinical module frontend

Implemented the primary metadata-discovered frames: `/search` (`5:182`), `/registration` (`5:230`), `/reports` (`5:278`), `/evaluation` (`5:326`) and `/settings` (`5:425`). Registration, evaluation and settings now persist through server APIs and Prisma; search reads patients and treatment records from PostgreSQL. Reports remain demonstrative until reporting requirements are defined.

The search and registration prototypes were visually inspected. Remaining screens follow their Figma metadata hierarchy and labels because high-fidelity design context remains rate-limited. Responsive layouts were added as an implementation adaptation.

### Dashboard frontend

Implemented `/dashboard` for the supplied prototype node `5:134`: four KPI cards (12,387 patients, 15-minute wait, 28-minute service, 96.8% satisfaction), paired bar charts for five service points, and twelve hourly capacity meters. June 2567 is the default reference state. Month and service-unit filters update deterministic demo fixtures; refresh updates the displayed timestamp, not a backend. Bars expose values on pointer hover or keyboard focus. Mobile layout stacks the charts and uses two KPI columns.

The prototype was visually inspected in the browser. Figma design-context calls remain rate-limited. Exported icons and existing shell assets remain unavailable, so exact asset parity is not claimed; metric/refresh indicators currently use text symbols. No database, API or authentication changes were made for this dashboard.

### Login frontend flow

`/login` now contains username/password/department fields, a password visibility toggle, required-field and demo-credential validation, and navigation to `/` on success. The demo account is `demo` / `demo1234`, department `ผู้ดูแลระบบ`. AppShell uses a browser-only session gate; logout clears the session flag and returns to login. Refreshing preserves the demo session within the tab. No password is persisted or transmitted. KU All-Login displays an explicit unavailable notice rather than pretending to authenticate.

The supplied prototype for `25:3523` became visually accessible in the browser. Its two-column composition and field labels informed the provisional frontend layout, using existing project colors and typography. High-fidelity design context is still rate-limited, and the background illustration, university seal and exported input icons are unavailable. This screen therefore still needs asset completion and exact visual verification; it is not a completed Figma match. The demo-account helper is an intentional addition for testing.

High-fidelity design context and screenshot were retrieved for home frame `1:2` (1440 × 1273). The home page now uses that context for its content, colors, typography, spacing, banner slot, announcement cards and navigation shell. Fonts are bundled locally via @fontsource; no Google Fonts request is needed at runtime. The rendered desktop banner starts at x=408, y=321 and the announcement cards at y=785 and y=956, matching the reference vertical layout. Responsive behavior is an implementation adaptation; no mobile design was supplied.

The asset download attempts failed, so visual acceptance is **not passed**. Missing artwork is explicitly marked rather than substituted. No claim of a complete or pixel-identical implementation is made.

## Blocking conditions

1. Figma MCP responded: “You've reached the Figma MCP tool call limit on the Starter plan” when requesting dashboard, search, registration and reports. Do not repeatedly retry until quota/access changes.
2. The asset URLs returned in home design context could not be downloaded: direct Node/PowerShell requests timed out; the browser returned ERR_BLOCKED_BY_CLIENT. No original asset bytes have been obtained or verified. URLs were not embedded into application code.
3. Docker Engine is unavailable. Compose configuration passed validation, but no Docker image build, migration execution or PostgreSQL integration success is claimed.

## Assets still required

Place the exact original exports in `public/figma/`, with these filenames. Rebuild after adding them. Keep SVG root dimensions intact. The mapping is also in `src/lib/design-manifest.ts`.

| Design node | Slot | File |
| --- | --- | --- |
| 128:1203 | Main banner, 942 × 255 crop | a8cf2.png |
| 128:1218 | Announcement poster, 174 × 174 | c3be7.png |
| 1:16 | Avatar, 66 × 66 | 9d52b.svg |
| 1:23 | Menu mask / menu artwork | cfe7c.svg / 6f91b.svg |
| 5:55 | Header separator | 6767e.svg |
| 1:62 | Sidebar separator | 096d2.svg |
| 5:58 | Notification/account artwork, 59 × 40.131 | 9d2ae.svg |
| 5:72 | Dashboard icon | 2a22a.svg |
| 5:78 | Search icon | 8a847.svg |
| 5:84 | Registration icon | 321b5.svg |
| 5:90 | Reports icon | 4122c.svg |
| 5:102 | Evaluation icon | 1b910.svg |

Menu mask application and every SVG's effective rendered geometry must be verified when the original files become available. Current missing-asset handling is a temporary incomplete state, not a design-approved variant.

## Remaining frames found in metadata

Metadata provided names, positions and hierarchy used for provisional frontend implementation. Retrieve high-fidelity design context and screenshots before claiming exact visual parity.

| Node | Frame name |
| --- | --- |
| 5:134 | page 1.1 (dashboard) |
| 5:182 | page 2 |
| 15:1188 | page 2.2 |
| 15:1262 | page 2.3 |
| 53:642 | page 2.3 |
| 15:1336 | page 2.3 |
| 15:1410 | page 2.3 |
| 5:230 | page 3.1 |
| 5:278 | page 4.1 |
| 5:326 | page 5.1 |
| 5:425 | setting page |
| 1:45 | page 0.1 |
| 1:36 | page 0 |
| 25:3523 | log-in |

The application still requires real authentication, authorization, full clinical validation and production workflow tests. The current demo session is not a security boundary for the new API routes.
