"use server"
import { fetchApi } from "@/src/lib/data/api"
import { StreamerSchema, StreamerState } from "@/src/lib/data/streams/definitions"
import { fetchInfo, getHuyaId } from "@/src/lib/data/platform/huya/apis"
import { PlatformType } from "@/src/lib/data/platform/definitions"
import { BackendStreamerPayload, normalizeStreamerPayloadForBackend } from "@/src/lib/data/streams/payload"
import { fetchConfig } from "@/src/lib/data/config/apis"

type BackendStreamerResponse = Omit<StreamerSchema, "state"> & {
	isActivated?: boolean
	isLive?: boolean
	state?: StreamerState
}

function mapBackendStreamer(streamer: BackendStreamerResponse): StreamerSchema {
	const derivedState =
		typeof streamer.state === "number"
			? streamer.state
			: streamer.isActivated === false
				? StreamerState.CANCELLED
				: streamer.isLive
					? StreamerState.LIVE
					: StreamerState.NOT_LIVE

	return {
		...(streamer as StreamerSchema),
		platform: streamer.platform?.toLowerCase(),
		state: derivedState,
	}
}

async function resolveXiaohongshuCookies(streamer: StreamerSchema): Promise<string | null | undefined> {
	if (streamer.platform?.toLowerCase() !== PlatformType.XIAOHONGSHU) {
		return streamer.downloadConfig?.cookies
	}

	const existingCookies = streamer.downloadConfig?.cookies?.trim()
	if (existingCookies) {
		return existingCookies
	}

	try {
		const config = await fetchConfig()
		const globalCookies = config.xiaohongshuConfig?.cookies?.trim()
		if (globalCookies) {
			return globalCookies
		}
	} catch {
		// Ignore config lookup failures and fall back to existing streamers.
	}

	try {
		const response = await fetchApi("/streamers", { cache: "no-cache" })
		if (!response.ok) {
			return streamer.downloadConfig?.cookies
		}

		const streamers = (await response.json()) as BackendStreamerResponse[]
		const candidate = streamers.find(item => {
			const platform = item.platform?.toLowerCase()
			const cookies = item.downloadConfig?.cookies?.trim()
			return platform === PlatformType.XIAOHONGSHU && !!cookies
		})

		return candidate?.downloadConfig?.cookies ?? streamer.downloadConfig?.cookies
	} catch {
		return streamer.downloadConfig?.cookies
	}
}

export const fetchStreamers = async (filter: string) => {
	const response = await fetchApi("/streamers?filter=" + filter, {
		cache: "no-cache",
	})
	if (!response.ok) {
		const errorText = await response.text()
		throw new Error("Error fetching streamers, status: " + response.status + " " + errorText)
	}
	const streamers = (await response.json()) as BackendStreamerResponse[]
	return streamers.map(mapBackendStreamer)
}

export const fetchStreamer = async (id: string) => {
	const response = await fetchApi("/streamers/" + id, {
		cache: "no-cache",
	})
	if (!response.ok) {
		const errorText = await response.text()
		throw new Error("Error fetching streamer, status: " + response.status + " " + errorText)
	}
	const json = (await response.json()) as BackendStreamerResponse
	return mapBackendStreamer(json)
}

export const createStreamer = async (streamer: StreamerSchema) => {
	const resolvedCookies = await resolveXiaohongshuCookies(streamer)
	const streamerWithResolvedCookies: StreamerSchema =
		streamer.platform?.toLowerCase() === PlatformType.XIAOHONGSHU
			? {
					...streamer,
					downloadConfig: {
						...streamer.downloadConfig,
						cookies: resolvedCookies ?? null,
					},
				}
			: streamer
	const backendStreamer: BackendStreamerPayload = normalizeStreamerPayloadForBackend(streamerWithResolvedCookies)
	if (!backendStreamer.avatar || backendStreamer.avatar !== "") {
		if (backendStreamer.platform?.toLowerCase() === PlatformType.HUYA) {
			let urlId = getHuyaId(backendStreamer.url)
			const { avatar, room } = await fetchInfo(urlId)
			backendStreamer.avatar = avatar
			// replace url with room
			// streamer.url = streamer.url.replace(urlId, room)
		}
	}

	const response = await fetchApi("/streamers", {
		method: "POST",
		body: JSON.stringify(backendStreamer),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error("Error posting streamer, status: " + response.status + " " + errorText)
	}
	let json = (await response.json()) as StreamerSchema
	return json
}

export const updateStreamer = async (streamer: StreamerSchema) => {
	const resolvedCookies = await resolveXiaohongshuCookies(streamer)
	const streamerWithResolvedCookies: StreamerSchema =
		streamer.platform?.toLowerCase() === PlatformType.XIAOHONGSHU
			? {
					...streamer,
					downloadConfig: {
						...streamer.downloadConfig,
						cookies: resolvedCookies ?? null,
					},
				}
			: streamer
	const backendStreamer: BackendStreamerPayload = normalizeStreamerPayloadForBackend(streamerWithResolvedCookies)
	const response = await fetchApi("/streamers/" + streamer.id, {
		method: "PUT",
		body: JSON.stringify(backendStreamer),
	})
	if (!response.ok) {
		const errorText = await response.text()
		throw new Error("Error updating streamer, status: " + response.status + " " + errorText)
	}
	let json = (await response.json()) as StreamerSchema
	return json
}

export const updateState = async (id: string, state: StreamerState) => {
	const activated = state !== StreamerState.CANCELLED
	const response = await fetchApi(`/streamers/${id}?state=${activated}`, {
		method: "PUT",
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error("Error updating streamer state, state: " + response.status + " " + errorText)
	}
	return (await response.json()) as {
		msg: string
		code: number
	}
}

export const deleteStreamer = async (id: string | number) => {
	const response = await fetchApi("/streamers/" + id, {
		method: "DELETE",
	})
	if (!response.ok) {
		const errorText = await response.text()
		throw new Error("Error deleting streamer, status: " + response.status + " " + errorText)
	}
}
