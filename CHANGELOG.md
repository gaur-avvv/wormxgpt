# WormGPT Changelog

## [1.2.0] - 2026-04-13
### Added (Task 6: Browser Extension)
- **Manifest V3 Core**: Deployed `/extension` architecture containing `manifest.json`, `background.js`, `content_script.js`, and sidepanel overlays.
- **Mozilla Readability**: Bundled `Readability.js` to automatically extract clean semantics from active pages.
- **Agentic Observation Layer**: Extension isolates rendering logic and emits viewport properties, structural DOM maps, and content summaries to the LLM backend over MV3 message passing channels.
- **Tri-Mode Interaction System**:
  - `OBSERVE`: Silent data mapping with a discrete visual watermark.
  - `ASSIST`: Generates highlighted visual tags injected over absolute DOM layers for direct human feedback.
  - `AUTOPILOT`: Integrates `browser_action('click' | 'fill')` orchestrator logic triggering synthetic React user interactions.
- **Anthropic Proxy Hook**: Implemented a stateless API proxy strictly targeting `claude-3-7-sonnet-20250219`. API signatures are kept local in `chrome.storage.local`.
- **Security & Logging**: Enabled RegEx-driven domain blacklisting locking down execution on sensitive domains (Banking, Medical, Govt). Embedded immutable debug history appended to `wgpt_audit_logs`.

## [1.1.0] - 2026-04-13
### Added (Task 5: Frontend Perf & Agentic Intelligence)
- **Supabase pgvector Connectivity**: Orchestrated global memory using `match_agent_memory` RPC protocols to cross-link conversations deterministically over multiple user sessions. 
- **ReAct Supervisors**: Intercepted single-turn AI outputs with a Generator Loop in `agent_engine.ts` utilizing Sub-Agent `Promise.all` resolution mapping and post-action `1-5` confidence evaluations.
- **Tree-Shook UI Nodes**: Refactored `CodeBlock.tsx` and massive Markdown payload renderers out of the main `App.tsx` body using `React.lazy()` and `<Suspense>`.

## [1.0.1] - 2026-04-13
### Fixed
- Stabilized Generator chunk typings yielding `video`, `audio`, and `sources` natively inside `App.tsx` avoiding catastrophic render crashes on Pollinations AI media payloads.
