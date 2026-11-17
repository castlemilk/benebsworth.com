import { readFile } from 'node:fs/promises'
import { verifyArtPacket, writeArtPacket } from './lib/svg-art-packet'

const args = process.argv.slice(2)
const check = args[0] === '--check'
const [recipeFile, outputRoot, ...extra] = check ? args.slice(1) : args
if (!recipeFile || !outputRoot || extra.length) {
  console.error('Usage: node --import tsx scripts/export-art-packet.mts [--check] RECIPES.json OUTPUT_DIRECTORY_OR_PACKET')
  process.exitCode = 1
} else {
  try {
    const input = JSON.parse(await readFile(recipeFile, 'utf8'))
    if (check) {
      await verifyArtPacket(input, outputRoot)
      console.log('Verified packet inventory, SVG bytes, recipes and hashes against the registered source.')
    } else {
      const path = await writeArtPacket(input, outputRoot)
      console.log(`Wrote immutable SVG packet: ${path}`)
    }
    console.log('Technical and visual review are still required. Nothing was uploaded or published.')
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
