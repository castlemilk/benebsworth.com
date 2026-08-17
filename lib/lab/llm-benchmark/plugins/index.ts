/**
 * Plugin roster.
 *
 * Each shipped plugin is imported statically here and registered — the
 * equivalent of a dsh bundle list. Adding a plugin = add one import + one
 * registerPlugin() call; the plugin's own module does the heavy lifting.
 *
 * Order matters for collisions: later registrations win for same-named
 * checks/scorers/demos (see plugins/registry.ts), so built-ins can be
 * overridden deliberately by listing a plugin after them.
 */
import { registerPlugin } from './registry'
import { communityTasks } from './community-tasks'
import { gatewayTasks } from './gateway-tasks'

registerPlugin(communityTasks)
// The first FIRST-PARTY archetype plugin (#22): a new task archetype
// (gateway behaviour — fail-closed / backoff / no-fabrication) added without
// touching registry.ts, scorers/checks.ts, prompts.ts or the demo registry.
registerPlugin(gatewayTasks)

export * from './registry'
