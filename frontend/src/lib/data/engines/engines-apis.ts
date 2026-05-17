"use server"

import { fetchApi } from "../api"
import { engineConfigSchema, DownloadEngineSchema } from "./definitions"

function getDefaultEngineConfig(engineName: string): DownloadEngineSchema | undefined {
	switch (engineName) {
		case "ffmpeg":
			return {
				type: "ffmpeg",
				useBuiltInSegmenter: false,
				exitDownloadOnError: false,
			}
		case "streamlink":
			return {
				type: "streamlink",
				useBuiltInSegmenter: false,
				exitDownloadOnError: false,
			}
		case "kotlin":
			return {
				type: "kotlin",
				enableFlvFix: false,
				enableFlvDuplicateTagFiltering: false,
				combineTsFiles: false,
			}
		default:
			return undefined
	}
}

export const fetchEngineConfig = async (globalId: number, engineName: string) => {
	const response = await fetchApi(`/${globalId}/engines/${engineName}`)
	if (!response.ok) {
		if (response.status === 404) {
			return getDefaultEngineConfig(engineName)
		}
		const errorText = await response.text()
		throw new Error("Error fetching engine config, status: " + response.status + " " + errorText)
	}
	const json = await response.json()
	// validate json as DownloadEngineSchema
	engineConfigSchema.parse(json)
	return json
}

export const updateEngineConfig = async (globalId: number, engineName: string, config: DownloadEngineSchema) => {
	const response = await fetchApi(`/${globalId}/engines/${engineName}`, {
		method: "PUT",
		body: JSON.stringify(config),
	})
	if (!response.ok) {
		if (response.status === 404) {
			return config
		}
		const errorText = await response.text()
		throw new Error("Error updating engine config, status: " + response.status + " " + errorText)
	}

	return config
}
