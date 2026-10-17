import fs from 'node:fs'
import path from 'node:path'
import { generateFromCli } from './cli'
import type { BenchmarkModel, BenchmarkTask } from '../types'

/**
 * One generation inside an improvement loop.
 *
 * A loop needs the artefact on disk, not the reply text: the next round has to
 * measure it in a browser and quote it back to the model. So this is the CLI
 * runner with the file handoff forced on and an explicit destination, returning
 * the file's contents rather than stdout.
 */

export interface OpencodeLoopOptions {
  /** opencode model id, e.g. `zai-coding-plan/glm-5.3`. */
  model: string
  prompt: string
  /** Where the generated page must land. */
  artifactPath: string
  timeoutMs?: number
}

export interface OpencodeLoopResult {
  ok: boolean
  artifact: string
  runtimeMs: number
  tokensOut: number
  error?: string
}

export async function runOpencodeArtifact(options: OpencodeLoopOptions): Promise<OpencodeLoopResult> {
  const started = Date.now()
  fs.mkdirSync(path.dirname(options.artifactPath), { recursive: true })

  // The shared CLI runner keys a lot of its bookkeeping off the model and task
  // shapes; here they are loop metadata, which is exactly what the runner wants
  // for its label and artifact name.
  const stubModel = {
    id: `loop/${options.model.replaceAll('/', '-')}`,
    name: options.model,
    provider: 'OpenCode',
    apiModelId: options.model,
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
    contextWindow: 0,
    capabilities: '',
    company: '',
  } as unknown as BenchmarkModel
  const stubTask = {
    id: 'improvement-loop',
    name: 'Improvement loop',
    prompt: options.prompt,
    iterationsDefault: 1,
  } as unknown as BenchmarkTask

  try {
    const response = await generateFromCli(
      {
        command: 'opencode',
        artifactViaFile: true,
        artifactName: () => path.basename(options.artifactPath),
        buildArgs: (prompt: string) => ['run', '-m', options.model, prompt],
        timeoutMs: options.timeoutMs,
      },
      stubModel,
      stubTask,
      0,
    )
    // The runner copies the artefact out of the CLI's own session dir; read it
    // back from where we asked for it, and fall back to the reply if the CLI
    // printed the page inline instead.
    const artifact = fs.existsSync(options.artifactPath)
      ? fs.readFileSync(options.artifactPath, 'utf8')
      : response.output
    return {
      ok: artifact.trim().length > 0,
      artifact,
      runtimeMs: response.runtimeMs,
      tokensOut: response.tokensOut,
      error: artifact.trim().length > 0 ? undefined : 'no artifact was produced',
    }
  } catch (error) {
    return {
      ok: false,
      artifact: '',
      runtimeMs: Date.now() - started,
      tokensOut: 0,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
