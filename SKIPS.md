# RPC migration — skips & stragglers (data-exporter)

## Server method definitions

**None to migrate.** The only `Meteor.methods({...})` block in the repo lives
in `server/methods.proxy.js` and is **entirely commented out** (the legacy
`proxyInsert` / `proxyInsertResource` HTTP-export proxy methods). No active
`Meteor.ServerMethods.define` conversions were possible; nothing was defined.

## Client call sites — all left as DDP stragglers

Every `Meteor.call` in `client/` targets a method name that is **absent from
`/tmp/rpc-method-map.json`** (defined in core / another package and not yet
migrated), or uses a **dynamic method name**. Per the migration rule
(unknown name → leave `Meteor.call` + `// rpc-migration: ddp-straggler`),
all were marked and left behind, behavior-preserving:

| File | Line(s) | Method | Reason |
|------|---------|--------|--------|
| `client/ExportComponent.jsx` | storeBundleToWarehouse, getServerStats, postRelay | not in map | external, unmigrated |
| `client/CollectionManagement.jsx` | getServerStats (module-scope), initializeChecklilsts, `Meteor.call(signature)`, getServerStats (nested) | not in map / dynamic | external + dynamic name |
| `client/JsonEditorComponent.jsx` | getServerStats, `Meteor.call(signature)` | not in map / dynamic | external + dynamic name |

Note: `ExportComponent.jsx` is legacy old-MUI UI that `client.js` no longer
routes/bundles (see CLAUDE.md — "Legacy files kept for reference but
unbundled"); it was still marked for completeness.
