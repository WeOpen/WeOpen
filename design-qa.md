# Design QA — WeOpen Nothing-Style Admin Refactor

Final result: passed

## Scope

Reference images under `docs/image/` were treated as the visual source of truth for the WeOpen management UI refactor. The latest active local verification target is `http://localhost:3000`; the stale `3010` preview is intentionally not used.

Fonts required by the Nothing design direction are loaded through the shared UI stylesheet: `Doto`, `Space Grotesk`, and `Space Mono` from Google Fonts.

## Reference → implementation evidence

| Reference | Route | Latest 2K implementation screenshot | Verdict |
| --- | --- | --- | --- |
| `docs/image/Dashboard.png` | `/dashboard` | `.codex-artifacts/weopen-nothing-refactor-2k/dashboard.png` | Passed |
| `docs/image/Plugin.png` | `/plugins` | `.codex-artifacts/weopen-nothing-refactor-2k/plugins.png` | Passed |
| `docs/image/Blog.png` | `/blog` | `.codex-artifacts/weopen-nothing-refactor-2k/blog.png` | Passed |
| `docs/image/Storage.png` | `/storage` | `.codex-artifacts/weopen-nothing-refactor-2k/storage.png` | Passed |
| `docs/image/domains.png` | `/domains` | `.codex-artifacts/weopen-nothing-refactor-2k/domains.png` | Passed |
| `docs/image/devtools.png` | `/tools` | `.codex-artifacts/weopen-nothing-refactor-2k/tools.png` | Passed |
| `docs/image/settings.png` | `/settings` | `.codex-artifacts/weopen-nothing-refactor-2k/settings.png` | Passed |
| `docs/image/login.png` | `/login` | `.codex-artifacts/weopen-nothing-refactor-2k/login.png` | Passed |
| `docs/image/design-system.png` | `/design-system` | `.codex-artifacts/weopen-nothing-refactor-2k/design-system.png` | Passed |
| 3000 dev debug | `/dashboard` | `.codex-artifacts/weopen-nothing-refactor-3000-debug/dashboard-2048x997.png` | Passed |
| 3000 mid-width debug | `/design-system` | `.codex-artifacts/weopen-nothing-refactor-3000-debug/design-system-2048x997.png` | Passed |
| 3000 mid-width debug | `/design-system` | `.codex-artifacts/weopen-nothing-refactor-3000-debug/design-system-1440x900-after.png` | Passed |
| 3000 mid-width debug | `/design-system` | `.codex-artifacts/weopen-nothing-refactor-3000-debug/design-system-1512x982-after.png` | Passed |
| 3000 login fit | `/login` | `.codex-artifacts/weopen-login-fit/login-2048x997-final-full.png` | Passed |
| 3000 login fit | `/login` | `.codex-artifacts/weopen-login-fit/login-1440x900-final-full.png` | Passed |
| 3000 login fit | `/login` | `.codex-artifacts/weopen-login-fit/login-1366x768-final-full.png` | Passed |
| 3000 sidebar compact | `/dashboard` | `.codex-artifacts/weopen-sidebar-compact/dashboard-2048x997.png` | Passed |
| 3000 sidebar compact | `/dashboard` | `.codex-artifacts/weopen-sidebar-compact/dashboard-1440x900.png` | Passed |
| 3000 nav icon motion | `/dashboard` | `.codex-artifacts/weopen-nav-icon-motion/dashboard-normal-2048x997.png` | Passed |
| 3000 nav icon motion | `/dashboard` API hover | `.codex-artifacts/weopen-nav-icon-motion/dashboard-api-hover-2048x997.png` | Passed |
| 3000 nav icon motion | `/tools` active | `.codex-artifacts/weopen-nav-icon-motion/tools-active-2048x997.png` | Passed |
| 3000 Motion nav | `/dashboard` | `.codex-artifacts/weopen-motion-nav/dashboard-normal-2048x997.png` | Passed |
| 3000 Motion nav | `/dashboard` API hover | `.codex-artifacts/weopen-motion-nav/dashboard-api-hover-2048x997.png` | Passed |
| 3000 Motion nav | `/tools` active | `.codex-artifacts/weopen-motion-nav/tools-active-2048x997.png` | Passed |
| 3000 dot scrollbar | `/dashboard` scrolled | `.codex-artifacts/weopen-dot-scrollbar/dashboard-scrollbar-1440x900.png` | Passed |
| 3000 visible dot scrollbar | `/dashboard` top | `.codex-artifacts/weopen-visible-dot-scrollbar/dashboard-top-1440x900.png` | Passed |
| 3000 visible dot scrollbar | `/dashboard` scrolled | `.codex-artifacts/weopen-visible-dot-scrollbar/dashboard-scrolled-1440x900.png` | Passed |
| 3000 hide native scrollbar | `/domains` scrolled | `.codex-artifacts/weopen-hide-native-scrollbar/domains-scrolled-2048x997.png` | Passed |
| 3000 contained custom scroll | `/domains` scrolled | `.codex-artifacts/weopen-hide-native-scrollbar/domains-contained-scroll-2048x997.png` | Passed |
| 3000 horizontal custom scroll | `/dashboard` module table | `.codex-artifacts/weopen-horizontal-scrollbar/dashboard-module-horizontal-1100x900.png` | Passed |
| 3000 horizontal custom scroll | `/storage` DataTable | `.codex-artifacts/weopen-horizontal-scrollbar/storage-table-horizontal-1100x900.png` | Passed |
| 3000 dashboard horizontal scroll fix | `/dashboard` module table | `.codex-artifacts/weopen-horizontal-scrollbar/dashboard-module-horizontal-fixed-1440x900.png` | Passed |

## 2K density checklist

- [x] 2560×1440 shell is less cramped: sidebar, topbar, content gutters, card gaps, and table rows scale up for true wide layouts, while the `1440px–2199px` mid-width override prevents ordinary desktop dev windows from inheriting oversized 2K density.
- [x] Dashboard metric cards and overview panels have larger instrument-like proportions without losing the strict console grid.
- [x] Blog editor, storage table, domains/TLS matrix, devtools workbench, settings console, design system catalog, and login split layout remain readable without horizontal overlap.
- [x] Metric card value/chip rows stay legible in 2K, including DevTools runtime status.
- [x] Nothing-style constraints remain intact: OLED black, monochrome chrome, thin borders, no shadows/blur/gradients in UI chrome, and red reserved for active/critical signals. The web shell now forces dark theme on boot so stale `localStorage.weopen-theme=light` cannot create black-on-black text.

## Blocking checklist

- [x] OLED black, monochrome console shell is consistent across authenticated routes.
- [x] Sidebar/topbar rhythm matches the reference family: fixed left rail, command center bar, environment/region/version/read-only metadata.
- [x] Nothing-style typography is loaded through the shared UI stylesheet: Doto, Space Grotesk, and Space Mono.
- [x] UI chrome avoids shadows, blur, gradients, and rounded app-card styling; borders and spacing carry hierarchy.
- [x] Red is reserved for active route, warning/accent, and critical state signals.
- [x] Dashboard, plugin registry, blog editor, storage objects, domains/TLS, devtools, settings/audit, login, and custom component catalog all have dedicated layouts aligned to their reference image.
- [x] Design System route demonstrates the new internal primitives and the theme-token panel requested by the prototype.
- [x] Offline API states do not obscure the visual prototype; sample data is used for visual continuity while preserving real controls for live API data.
- [x] No HeroUI dependency/import is used in the web or UI package surfaces.

## Notes from visual comparison

- The 2K pass keeps the same information architecture while increasing the breathing room that carries the Nothing-style hierarchy.
- The 1440px+ media query intentionally expands layout rhythm for wide layouts, with a later 1440–2199px override to keep mid-width browser windows readable. This uses CSS viewport width, not physical pixels, to account for Retina/QHD browser scaling.
- `/design-system` stacks its token panel below the component catalog at 1440–1599px, then restores the right-hand token rail on wider viewports.
- `/login` removes the separate red framed W mark, uses Doto for the WEOPEN wordmark, and fits tested desktop viewports without vertical scrolling.
- The shell sidebar brand uses a centered Doto WEOPEN wordmark, and the fixed left navigation rail is more compact while preserving readable labels and active state.
- Sidebar API/Tools and Dashboard DevTools code glyphs are size-normalized, with hover/focus/active nav icon motion and red accent color feedback.
- Sidebar navigation animation is implemented with Motion for React (`motion/react`): item movement, sweep layer, glyph color, rotation, translation, and tap scale are Motion variants.
- Native browser/window scrolling is disabled for the admin shell (`html/body overflow: hidden`), and route content now scrolls inside `.weopen-admin-main`.
- A visible in-app dot-matrix scroll rail is rendered in the admin shell because macOS/Chrome overlay scrollbars can ignore or obscure native pseudo-element styling; the rail uses Motion scroll progress from the main content container and red dot-matrix fill.
- Native scrollbars are hidden on the main scroll container (`scrollbar-width: none`, `::-webkit-scrollbar { display: none; width: 0; height: 0; }`) so the custom rail is the only visible scroll indicator.
- Horizontal overflow areas now use a custom `HorizontalScrollArea` with a 5px dot-matrix horizontal rail and red Motion thumb. It appears only when content can scroll sideways, covering shared `DataTable`, Dashboard modules, and Settings audit rows while keeping native horizontal scrollbars hidden.
- Dashboard module table scrollability is explicitly protected with `.dashboard-module-table.weopen-horizontal-scroll-viewport { overflow-x: auto; }` so legacy Dashboard `overflow: hidden` styling cannot disable user horizontal scrolling.
- Timestamps in Storage and Domains visual tables use deterministic UTC formatting so local dev hydration does not show a red Next.js issue badge over the custom scroll rail.
- Icons are approximated with existing monochrome text/glyph affordances to avoid adding dependencies; they remain flat, single-color, and data-console aligned.
- Some table content is representative sample data when the local API is unavailable. This is intentional for prototype fidelity and does not remove live API wiring.

## Remaining P3 polish

- Replace text/glyph icons with a no-dependency internal icon set if exact icon geometry becomes important.
- Add route-level visual regression tests if screenshot comparison becomes part of CI.
