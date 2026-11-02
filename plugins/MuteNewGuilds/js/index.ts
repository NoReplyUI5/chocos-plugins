import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { after } from '@valenced/patcher'

// Ported from the Vendetta plugin "Mute New Guilds" (originally from Vencord)
// Authors: carince, Glitch, Nuckyz

// TODO: replace with Valenced's settings/storage API once confirmed
const settings = {
	server: false, // mute the guild itself
	everyone: true, // suppress @everyone and @here
	roles: true, // suppress all role @mentions
}

export default plugin({
	start({ cleanup }) {
		let updateGuildNotificationSettings: any
		let UserGuildSettingsStore: any

		cleanup(
			getModules(withProps('updateGuildNotificationSettings'), mod => {
				updateGuildNotificationSettings = mod.updateGuildNotificationSettings
			}),
		)

		cleanup(
			getModules(withProps('isSuppressEveryoneEnabled'), store => {
				UserGuildSettingsStore = store

				// Reset the global (DM/null guild) settings if they were muted/suppressed
				const isMuted = store.isMuted(null)
				const isEveryoneSuppressed = store.isSuppressEveryoneEnabled(null)
				const isRolesSuppressed = store.isSuppressRolesEnabled(null)

				if (
					(isMuted || isEveryoneSuppressed || isRolesSuppressed) &&
					updateGuildNotificationSettings
				) {
					updateGuildNotificationSettings(null, {
						muted: false,
						suppress_everyone: false,
						suppress_roles: false,
					})
				}
			}),
		)

		cleanup(
			getModules(withProps('acceptInvite'), invites => {
				cleanup(
					after(invites as any, 'acceptInvite', (_args: any[], res: any) => {
						Promise.resolve(res).then(x => {
							const guildId = x?.guild?.id
							if (guildId == null || guildId === '@me' || guildId === 'null') return

							updateGuildNotificationSettings?.(guildId, {
								muted: settings.server,
								suppress_everyone: settings.everyone,
								suppress_roles: settings.roles,
							})
						})
					}),
				)
			}),
		)
	},
})
