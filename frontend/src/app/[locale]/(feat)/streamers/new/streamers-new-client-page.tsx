"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { StreamerFormWrapper } from "@/src/app/[locale]/(feat)/streamers/components/streamer-form-wrapper"
import { StreamerSchema, StreamerState } from "@/src/lib/data/streams/definitions"
import { clientBackendFetch } from "@/src/lib/data/client-backend"
import { PlatformType } from "@/src/lib/data/platform/definitions"
import { normalizeStreamerPayloadForBackend } from "@/src/lib/data/streams/payload"

const defaultStreamerValues: StreamerSchema = {
	name: "",
	url: "",
	state: StreamerState.NOT_LIVE,
	isTemplate: false,
	templateId: 0,
}

export default function StreamersNewClientPage() {
	const { data: session, status } = useSession()
	const [templateData, setTemplateData] = useState<StreamerSchema[]>([])
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!session?.user?.token) {
			return
		}

		let isMounted = true

		clientBackendFetch<StreamerSchema[]>("/streamers?filter=template", session.user.token)
			.then(data => {
				if (isMounted) {
					setTemplateData(
						data.map(item => ({
							...item,
							platform: item.platform?.toLowerCase() as PlatformType | undefined,
						}))
					)
					setError(null)
				}
			})
			.catch(err => {
				if (isMounted) {
					setError(err instanceof Error ? err.message : String(err))
				}
			})

		return () => {
			isMounted = false
		}
	}, [session?.user?.token])

	const createStreamer = useMemo(() => {
		return async (data: StreamerSchema) => {
			if (!session?.user?.token) {
				throw new Error("Session expired")
			}

			return await clientBackendFetch<StreamerSchema>("/streamers", session.user.token, {
				method: "POST",
				body: JSON.stringify(normalizeStreamerPayloadForBackend(data)),
			})
		}
	}, [session?.user?.token])

	if (status === "loading") {
		return <div className='rounded-lg border p-6 text-sm text-muted-foreground'>Loading...</div>
	}

	if (!session?.user?.token) {
		return <div className='rounded-lg border border-destructive/30 p-6 text-sm text-destructive'>Session expired</div>
	}

	if (error) {
		return <div className='rounded-lg border border-destructive/30 p-6 text-sm text-destructive'>{error}</div>
	}

	return (
		<StreamerFormWrapper
			defaultStreamerValues={defaultStreamerValues}
			templateData={templateData}
			onSubmit={createStreamer}
		/>
	)
}
