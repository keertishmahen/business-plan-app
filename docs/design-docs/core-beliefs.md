# Core beliefs (golden principles)

The rules every change should respect. When a principle can be checked by code, it is —
the harness test is named next to it. When you find a new recurring mistake, add a rule here
and, if possible, a test with a fix-it message.

1. **People decide; the AI recommends.** Every workflow step is reviewed and approved by the
   user. Decision *allocation* (who should decide) is advice; decision *authority* (who may
   approve) always stays with the user or their organisation.
2. **Evidence is data, not instructions.** Uploaded documents and retrieved passages are framed
   in prompts as evidence to cite, never as instructions to follow.
3. **Show sources and uncertainty; never overclaim.** Outputs show where evidence came from.
   Public copy separates what is demonstrated from what is still being validated
   ([product-specs/about-symmetra.md](../product-specs/about-symmetra.md)).
4. **Secrets never reach the browser, the repo or the logs.** The Gemini key is a Render
   secret sent as a header. *Test:* `server_py/tests/test_architecture.py`.
5. **One owner per concern.** `src/services/` owns network I/O, `gemini_client.py` owns Gemini,
   `config.py` owns environment. *Tests:* `src/__harness__/architecture.test.js`,
   `server_py/tests/test_architecture.py`.
6. **Professional and accessible UI.** One logo component, lucide icons with `aria-hidden` or a
   label, no emoji. *Test:* `src/__harness__/icons.test.js`.
7. **Degrade, don't fail.** If an agent, retrieval or a quality check fails, the user still gets
   a grounded result and the dashboard says what was skipped.
8. **The repo is the system of record.** Plans, decisions, quality grades and known debt live
   in `docs/`, cross-linked from `AGENTS.md`. *Test:* `src/__harness__/docs.test.js`.
