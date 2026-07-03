# Hiking admin — GCS + Google sign-in

The hiking gallery editor is **backend-free**: signing in with Google on a hiking
page yields an OAuth access token with the GCS read/write scope, and the browser
uploads photos **directly** to the bucket. Security is the bucket's IAM (only the
admin's account can write) + CORS — not the client-side email check (that only
decides whether the editor UI renders).

## Status — provisioned 2026-06-26 (Terraform)

Done, managed in **`infra/gcp/`** (state in `gs://benebsworth-web-tfstate`,
backend authenticates via your ADC):

| Resource | Value |
|---|---|
| GCP project | `benebsworth-web` (billing: gamma systems) |
| Photo bucket | `gs://benebsworth-hiking` (australia-southeast1, public-read) |
| Write IAM | `user:ben.ebsworth@gmail.com` → `roles/storage.objectAdmin` |
| Read IAM | `allUsers` → `roles/storage.objectViewer` |
| CORS | GET/HEAD/PUT/POST/OPTIONS for benebsworth.com, www, next, localhost:3000 |
| Env wired | `NEXT_PUBLIC_HIKE_BUCKET`, `NEXT_PUBLIC_HIKE_PUBLIC_BASE` in `.env` |

Re-apply / change infra: `terraform -chdir=infra/gcp plan` → `apply`
(edit `infra/gcp/variables.tf` for origins, bucket name, etc.).

## ⬜ Remaining — the OAuth Web client (console only)

Terraform's google provider has **no resource for a browser OAuth client**, so
this one step is manual (~3 min). In **console.cloud.google.com** with project
**benebsworth-web**:

1. **APIs & Services → OAuth consent screen** → External → **Testing** →
   add `ben.ebsworth@gmail.com` as a **Test user** (test users skip the
   "unverified app" warning). Scopes: `openid`, `email`,
   `…/auth/devstorage.read_write`.
2. **Credentials → Create credentials → OAuth client ID → Web application**.
   - **Authorized JavaScript origins**: `https://benebsworth.com`,
     `https://www.benebsworth.com`, `https://next.benebsworth.com`,
     `http://localhost:3000`. (No redirect URIs — GIS uses the token popup.)
   - Copy the **Client ID**.
3. In `.env`, set:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=<the-id>.apps.googleusercontent.com
   ```
4. Rebuild + deploy (`npm run deploy:pages:next` / `:prod`).

Then on a hiking page: discreet **◐ admin** (bottom-right) → sign in → the inline
**editor** appears on each hike. Add photos (auto-resized to webp, uploaded to
`gs://benebsworth-hiking/hiking/<slug>/`), caption, assign waypoints, reorder,
**Save** (writes `manifest.json`). Galleries read the manifest live — no redeploy.

Dev-only: append `?previewAdmin=1` to preview the editor UI without real OAuth.

## Code map

- `lib/hiking/config.ts` — public config (admin email is static here).
- `components/hiking/admin/admin-context.tsx` — GIS token client (email + GCS scope).
- `lib/hiking/gcs.ts` — browser resize→webp + direct GCS upload + manifest write.
- `components/hiking/admin/gallery-editor.tsx` — the editor UI (admin-only).
- `components/hiking/hike-journey.tsx` — reads the live manifest; map + gallery + (admin) editor.
- `infra/gcp/` — the bucket, IAM, and CORS as Terraform.
