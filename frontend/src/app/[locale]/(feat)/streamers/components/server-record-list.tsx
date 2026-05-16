import { deleteStreamer, fetchStreamers, updateState } from "@/src/lib/data/streams/streamer-apis"
import React, { useMemo } from "react"
import { RecordList } from "@/src/app/[locale]/(feat)/streamers/components/record-list"
import { useFormatter, useTranslations } from "next-intl"
import { toStreamerCards } from "@/src/app/[locale]/(feat)/streamers/utils/streamer-utils"
import { WS_API_URL } from "@/src/lib/data/events/events-api"
import { StreamerSchema } from "@/src/lib/data/streams/definitions"

export type ServerRecordListProps = {
	title: string
	filter: string | string[]
}

export function ServerRecordList({ title, filter }: ServerRecordListProps) {
	const t = useTranslations("StreamerData")
	const contextMenuT = useTranslations("OpenVideoContextMenu")
	const format = useFormatter()

	const contextMenuStrings = useMemo(
		() => ({
			download: contextMenuT("download"),
			openWithPotPlayer: contextMenuT("openWith", { player: "PotPlayer" }),
		}),
		[contextMenuT]
	)

	const filters = Array.isArray(filter) ? filter : [filter]
	const data = React.use(
		Promise.all(filters.map(currentFilter => fetchStreamers(currentFilter))).then(results => {
			const merged = new Map<number, StreamerSchema>()
			results.flat().forEach(streamer => {
				if (streamer.id != null) {
					merged.set(streamer.id, streamer)
				}
			})
			return Array.from(merged.values())
		})
	)

	const cards = useMemo(() => toStreamerCards(data, t, format), [data, t, format])

	return (
		<RecordList
			title={title}
			cards={cards}
			contextMenuStrings={contextMenuStrings}
			updateStatus={updateState}
			deleteStreamerAction={deleteStreamer}
			wsUrl={filters.includes("live") ? WS_API_URL : undefined}
		/>
	)
}
