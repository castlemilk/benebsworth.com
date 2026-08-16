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

registerPlugin(communityTasks)

export * from './registry'
