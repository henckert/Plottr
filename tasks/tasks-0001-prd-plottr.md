<!-- Project tasks derived from PRD: updated 2025-10-16 -->
# Plottr — Tasks (PRD 0001)

Status key: ✅ completed  •  🔶 in-progress  •  ⬜ not-started

1. ✅ Ask clarifying questions
   - Gather details about scope, priorities, integrations, naming rules, templates, acceptance criteria, file naming/sequence, and any constraints (map provider, geocoder).

2. ✅ Review PRD
   - Review `/tasks/0001-prd-plottr.md` and propose defaults where missing.

3. ✅ Confirm backend stack
   - Node.js + TypeScript + Express + Objection/Knex; OpenAPI 3; JWT; S3; Mapbox geocoding.

4. ✅ Generate parent tasks from PRD
   - Create high-level parent tasks and pause for confirmation.

5. ✅ Generate sub-tasks from PRD
   - Expand parents into detailed sub-tasks and list files to create.

6. ✅ Generate initial DB migration + seed
   - Create Postgres+PostGIS Knex migrations and a templates seed; add a Jest migration verification test.

7. ✅ Install Docker Desktop & start Postgres+PostGIS
   - Local dev instructions and the `plottr-pg` container setup were validated.

8. 🔶 Scaffold OpenAPI + server stubs
   - OpenAPI spec exists and has been extended; server stub generation is in-progress.

9. ⬜ Create RN prototype
   - Build a small React Native prototype using MapLibre + turf.js (not started).

10. ⬜ Infra & CI/CD
    - Define Dockerfiles, GitHub Actions, Terraform and S3 buckets (not started).

11. ⬜ Monitoring & Observability
    - Add logging, metrics, Sentry, Prometheus/Grafana (not started).

12. ⬜ Security & Compliance
    - Secrets/key rotation, vulnerability scanning, DPAs, audit controls (not started).

13. ⬜ Docs & Onboarding
    - API docs (OpenAPI UI), README, Postman collection, runbooks (not started).

14. ⬜ UX & Design
    - Mobile-first mocks and interaction flows (not started).

15. ⬜ Performance & Offline
    - Tile/geometry caching, ETag/versioning, offline sync (not started).

16. ⬜ Analytics & Data Pipeline
    - Event schema, HTTP sink, privacy controls (not started).

17. ⬜ Legal & Licensing
    - Confirm Mapbox/MapTiler licenses, geocoding limits, DPAs (not started).

18. ⬜ Backup & Disaster Recovery
    - DB backup strategy and S3 lifecycle policies (not started).

19. ✅ Integration test for templates endpoint
    - Supertest integration test added; runs migrations+seeds and validates GET /api/templates.

20. ✅ Wired OPENAI_MODEL config and helper
    - `OPENAI_MODEL` added to config and `.env.example`; `src/lib/openai.ts` present.

21. ✅ Generate TypeScript types from OpenAPI
    - `openapi/plottr.yaml` → `src/types/openapi.ts` generated and committed.

22. ✅ Add npm scripts: gen:types + check:types
    - `gen:types` and `check:types` added to `package.json`.

23. ✅ Type templates service & controller with OpenAPI types
    - Templates service/controller use generated OpenAPI types and Zod validation.

24. 🔶 Replicate types + Zod for venues/pitches/sessions
    - Files for `venues`, `pitches`, `sessions` were created; pattern replication is in-progress.

25. ✅ Commit staged changes
    - `package.json` and `.husky/pre-commit` updates committed.

26. ✅ Commit endpoint files
    - Newly created endpoints committed.

27. ✅ Add OpenAPI schemas for venues/pitches/sessions
    - `Venue`, `Pitch`, `Session` schemas added to OpenAPI and types regenerated.

28. ⬜ Create seeds for venues/pitches/sessions
    - Seeds required for integration tests (not started).

29. 🔶 Fix test DB connectivity & credentials
    - Investigation in progress: intermittent SASL / "unable to acquire connection" errors; deferred fixes applied (lazy knex init) and further triage pending.

30. ⬜ Improve tests
    - Replace placeholder unit tests with real tests and add integration tests for new endpoints (not started).

31. 🔶 Link Mapbox account
    - `MAPBOX_TOKEN` added to `.env.example` and `src/config`; server-side Mapbox wrapper, route, and controller created and in-progress verification.

---

Notes & next actions (short):
- Re-run integration tests now that DB initialization has been made lazy (`src/data/*repo.ts` constructors). If failures persist, add masked logging inside `src/data/knex.ts` and ensure `DATABASE_URL_TEST` is set before imports in tests.
- Add seeds for venues/pitches/sessions (task 28) once templates integration is green.
- If you want task 31 marked fully completed, confirm that Mapbox verification (calling `/api/geocode`) returned 200 and body data — I can then mark it ✅ and commit the tasks file.
