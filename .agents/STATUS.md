# Portfolio development handoff

Implemented a local-review draft in `public/`. No commit, push, or deployment performed.

The visual theme now uses the official Miasma.nvim palette: charcoal background, parchment text, foggy secondary text, muted-gold links, rust accents, and moss decorative lines. The favicon, renderer, browser theme color, and social preview match the site palette.

## Sources and decisions

- User explicitly approved filler/blanks for unanswered questions, then asked to preserve the current resume unchanged. These exceptions are recorded in PROJECT.md; its existing contact details remain by request.
- `temp.txt` supplied the three repository URLs, dual degree/major wording, temporary About copy approval, and Cloudflare hosting with an existing unspecified custom domain. Its information is retained in PROJECT.md; the file was deleted at the user's request.
- Resume supplied email, LinkedIn, current experience, May 2028 graduation, skills, and SDF contribution claims. Exact role start/end dates remain unknown, so all resume-current roles are labeled Current without invented chronology.
- SDF README: https://github.com/daneboyd20001/SRPLightingEngine — C++, GLSL, Raylib; CMake build instructions. User screenshots are authentic source assets. No benchmark claims are made from visible FPS counters.
- Blossom README: https://github.com/HunterLiles/Blossom/tree/Vulkan — Vulkan, HLSL, GLFW, ImGui, shader reload with existing-pipeline fallback, project browsing and embedded Neovim. Native script compilation/reload is explicitly not implemented. The supplied earlier 2D preview is clearly captioned as an earlier build, not Vulkan evidence.
- Trading URL returns HTTP 404 publicly. Its entry is temporary and notes access may be limited.
- Shared SDF ownership boundaries, per-project decision rationales/validation, and detailed personal contributions still need confirmation before final release.
- Terminal.css 0.7.5 is self-hosted with its MIT license. No frontend runtime, bundler, manifest, or package installation is needed to preview.
- The parametric wireframe torus is standalone site demonstration code generated for this implementation, not adapted from a tutorial or attributed to Hunter's flagship work.
- Published assets live directly under `public/assets/`; the redundant `extra/` source directory was removed at the user's request.
- `sync-agents` was run. Its output updates Development and the specification snapshot, but its installed generator emits shell errors and strips documentation paths from its own template. PROJECT.md explicitly assigns `.agents/` for notes. The external generator was not modified.

## Verification — September 12, 2026

- `node --check public/script.js`, internal link/asset checks, and `git diff --check`: pass.
- W3C Nu HTML validator version 26.9.9: zero errors or warnings after correcting the link-group role.
- Chromium 152.0.7977.82 on Linux, Node 26.8.1. Browser checks at 320, 375, 480, 600, 768, 900, 1024, 1440 CSS pixels: no horizontal overflow; assets resolve. Desktop and phone full-page screenshots reviewed.
- axe-core 4.10.3 WCAG 2/2.1 A/AA audit: zero violations. Lighthouse accessibility also 100 after correcting the wordmark accessible name and underlining the footer credit link.
- Verified renderer deferred until visible, animated output, button pause, native Enter-key resume, offscreen pause, hidden-tab pause, dynamic reduced-motion pause, touch-button pause, and real photograph default on touch. Fixed a CSS specificity bug exposed by the touch check.
- With JavaScript disabled, all three projects, professional/contact links, and static renderer fallback remain available. Simulated canvas context failure leaves the static fallback and no broken controls. Zero uncaught browser exceptions.
- Synthetic click-to-next-frame measurement with animation active: 4.3 ms in the final browser run. This is a desktop automated interaction check, not field INP or real-phone latency.
- Lighthouse 12.8.2: three cold-cache local HTTP navigation runs with default simulated mobile throttling (150 ms RTT, 1638.4 Kbps throughput, 4× CPU slowdown). All three scored Performance 100, Accessibility 100, Best Practices 100, SEO 100. LCP: 1126.3339, 1126.3269, 1126.1673 ms; median 1126.3269 ms (1.13 s). CLS 0 in all runs.
- The three Lighthouse measurements span only minor markup/touch-fallback corrections, with identical content/layout and all final category scores at 100. Repeat on the final production-served site for formal release acceptance.
- GitHub profile, SDF, Blossom Vulkan, and Terminal.css site returned HTTP 200. Trading returned 404. LinkedIn returned 999 to automated requests; retained the URL embedded in the supplied resume, but manual access remains unverified.

## Remaining release work

- User-authorized temporary About and Trading content; exact experience dates, opportunity availability, verified ownership and engineering decisions, and final degree wording consistent with the unchanged older resume.
- Confirm custom domain and existing Cloudflare service. Deploy only `public/`; verify HTTPS, compression, cache and security headers. Set canonical, og:url, and an absolute og:image URL using the supplied sharing PNG.
- Firefox, Safari, Edge, real iOS/Android, real-phone renderer profiling, actual browser zoom to 200%, comprehensive manual focus/contrast review, production Lighthouse/interaction checks, and an independent 60-second content review remain unperformed. Responsive emulation is not real-device coverage.

Optional checks live in `checks/`. Ignored screenshots, audit JSON, downloaded axe, Chromium profile, and temporary Lighthouse npm cache live in `.agents/check-output/` outside the deployment directory.
