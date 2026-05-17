import { PlatformType } from "@/src/lib/data/platform/definitions"
import { StreamerSchema, StreamerState } from "@/src/lib/data/streams/definitions"

export type BackendStreamerPayload = Omit<StreamerSchema, "state" | "engine" | "engineConfig"> & {
	isActivated: boolean
	isLive: boolean
	lastLiveTime: number
}

function looksLikeAbsoluteWindowsPath(value: string): boolean {
	return /^[a-zA-Z]:\\/.test(value.trim())
}

function normalizeXiaohongshuUrl(url: string): string {
	const match = url.match(/https:\/\/(?:www\.)?xiaohongshu\.com\/(?:hina\/)?livestream\/(?:[^/?#]+\/)?(\d+)/i)
	return match ? `https://www.xiaohongshu.com/livestream/${match[1]}` : url
}

export function normalizeStreamerPayloadForBackend(streamer: StreamerSchema): BackendStreamerPayload {
	const normalizedDownloadConfig = streamer.downloadConfig
		? {
				...streamer.downloadConfig,
				engine: undefined,
		  }
		: streamer.downloadConfig

	const normalizedStreamer: StreamerSchema = {
		...streamer,
		downloadConfig: normalizedDownloadConfig,
	}

	if (normalizedStreamer.platform?.toLowerCase() === PlatformType.XIAOHONGSHU) {
		normalizedStreamer.url = normalizeXiaohongshuUrl(normalizedStreamer.url)
		normalizedStreamer.downloadConfig = normalizedStreamer.downloadConfig
			? {
					...normalizedStreamer.downloadConfig,
					// The current backend deserializes Xiaohongshu streamers through DefaultDownloadConfig.
					type: "template",
				}
			: normalizedStreamer.downloadConfig
	}

	if (normalizedStreamer.downloadConfig) {
		const outputFolder = normalizedStreamer.downloadConfig.outputFolder?.trim()
		const outputFileName = normalizedStreamer.downloadConfig.outputFileName?.trim()

		if ((!outputFolder || outputFolder.length === 0) && outputFileName && looksLikeAbsoluteWindowsPath(outputFileName)) {
			normalizedStreamer.downloadConfig = {
				...normalizedStreamer.downloadConfig,
				outputFolder: outputFileName,
				outputFileName: "%H_%M_%S-{title}",
			}
		}
	}

	const { state, engine, engineConfig, ...rest } = normalizedStreamer as StreamerSchema & {
		engine?: string | null
		engineConfig?: unknown
	}

	return {
		...(rest as Omit<StreamerSchema, "state" | "engine" | "engineConfig">),
		isActivated: state !== StreamerState.CANCELLED,
		isLive: false,
		lastLiveTime: rest.lastLiveTime ?? 0,
	}
}
