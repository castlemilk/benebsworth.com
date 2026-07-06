#!/usr/bin/env node
// MCP server exposing the hike photo annotator. Tools:
//   list_hikes_with_photos · propose_annotations · get_proposal_report · write_manifest
// Auth: agy for classification (its own login), gsutil/gcloud (pinned account) for GCS.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { annotateHike } from '../src/pipeline.mjs'
import { writeReport } from '../src/report.mjs'
import { writeManifest, backupManifest, readManifest, readLibrary, mergeLibraryAssets } from '../src/manifest.mjs'
import { saveProposal, loadProposal } from '../src/proposal-cache.mjs'
import { BUCKET, GCLOUD_ACCOUNT, manifestPublicUrl } from '../src/config.mjs'

const pexec = promisify(execFile)
const text = (o) => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o, null, 2) }] })
const err = (s) => ({ content: [{ type: 'text', text: s }], isError: true })

const server = new McpServer({ name: 'hike-annotate', version: '0.1.0' })

server.tool(
  'list_hikes_with_photos',
  'List hikes whose manifest or namespaced library has gallery photos, with how many are unplaced (no slot).',
  {},
  async () => {
    const [{ stdout }, library] = await Promise.all([
      pexec('gsutil', ['ls', `gs://${BUCKET}/manifest/hike/`], {
        env: { ...process.env, CLOUDSDK_CORE_ACCOUNT: GCLOUD_ACCOUNT },
      }).catch(() => ({ stdout: '' })),
      readLibrary(),
    ])
    const slugs = stdout
      .split('\n')
      .map((l) => l.match(/manifest\/hike\/(.+)\.json$/)?.[1])
      .filter(Boolean)
    // Also include hikes that have assets in the library but no manifest yet.
    for (const a of library) {
      if (a.itemType === 'hike' && a.itemSlug && !slugs.includes(a.itemSlug)) slugs.push(a.itemSlug)
    }
    const rows = []
    for (const slug of slugs) {
      const m = await readManifest(slug)
      const gallery = mergeLibraryAssets(m, library, slug)
      rows.push({ slug, photos: gallery.length, unplaced: gallery.filter((a) => !a.slot).length })
    }
    return text(rows)
  },
)

server.tool(
  'propose_annotations',
  'Classify + geo-place every photo of a hike with agy; produce a proposed manifest + an HTML review report. Does NOT write to GCS.',
  { slug: z.string(), limit: z.number().optional(), hint: z.string().optional(), concurrency: z.number().optional() },
  async ({ slug, limit, hint, concurrency }) => {
    const run = await annotateHike(slug, { limit: limit ?? Infinity, hint: hint ?? '', concurrency: concurrency ?? 4 })
    const reportPath = await writeReport(run)
    const saved = await saveProposal(slug, run, reportPath, new Date().toISOString())
    const byWp = {}
    for (const m of run.metas) byWp[m.slot || '(unplaced)'] = (byWp[m.slot || '(unplaced)'] || 0) + 1
    return text({
      slug,
      photos: run.metas.length,
      placed: run.metas.filter((m) => m.slot).length,
      skip: run.metas.filter((m) => m.skip).length,
      manual: run.metas.filter((m) => m.needsManual).length,
      hero: run.heroId,
      partial: run.partial,
      placement: byWp,
      reportPath: saved.reportPath,
    })
  },
)

server.tool(
  'get_proposal_report',
  'Get the cached proposal summary + report path for a hike (from the last propose_annotations).',
  { slug: z.string() },
  async ({ slug }) => {
    const p = await loadProposal(slug).catch(() => null)
    if (!p) return text(`No proposal cached for ${slug}. Run propose_annotations first.`)
    return text({ slug, partial: p.partial, heroId: p.heroId, reportPath: p.reportPath, galleryCount: p.proposal.gallery.length })
  },
)

server.tool(
  'write_manifest',
  'Write the cached proposed manifest for a hike to GCS (LIVE). Requires confirm:true and a non-partial proposal.',
  { slug: z.string(), confirm: z.boolean() },
  async ({ slug, confirm }) => {
    if (!confirm) return err('Refused: pass confirm:true to write the live manifest.')
    const p = await loadProposal(slug).catch(() => null)
    if (!p) return err(`No proposal cached for ${slug}. Run propose_annotations first.`)
    if (p.partial) return err(`Refused: cached proposal for ${slug} is PARTIAL (limit was set). Re-run propose_annotations without limit.`)
    await backupManifest(slug, p.manifest, p.dir, new Date().toISOString().replace(/[:.]/g, '-'))
    const uri = await writeManifest(slug, p.proposal, p.dir)
    return text(`Wrote ${uri} (${p.proposal.gallery.length} photos). Live manifest: ${manifestPublicUrl(slug)}`)
  },
)

await server.connect(new StdioServerTransport())
