"use client"

import React, { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import PlatformForm from "@/src/app/[locale]/(feat)/settings/platform/platform-form"
import { GlobalConfig } from "@/src/lib/data/config/definitions"
import { clientBackendFetch } from "@/src/lib/data/client-backend"
import { useHuyaTranslations } from "@/src/app/hooks/translations/huya-translations"
import { useDouyinQualityTranslations, useDouyinTranslations } from "@/src/app/hooks/translations/douyin-translations"
import { useDouyuQualityTranslations, useDouyuTranslations } from "@/src/app/hooks/translations/douyu-translations"
import { useTwitchQualityTranslations, useTwitchTranslations } from "@/src/app/hooks/translations/twitch-translations"
import {
	usePandaTvQualityTranslations,
	usePandaTvTranslations,
} from "@/src/app/hooks/translations/pandatv-translations"
import { useWeiboTranslations } from "@/src/app/hooks/translations/weibo-translations"
import { useXiaohongshuTranslations } from "@/src/app/hooks/translations/xiaohongshu-translations"

export default function PlatformClientPage() {
	const { data: session, status } = useSession()
	const [config, setConfig] = useState<GlobalConfig | null>(null)
	const [error, setError] = useState<string | null>(null)
	const settingsT = useTranslations("SettingsPage")

	const huyaT = useHuyaTranslations()
	const douyinT = useDouyinTranslations()
	const douyinQualityOptions = useDouyinQualityTranslations()
	const douyuT = useDouyuTranslations()
	const douyuQualityOptions = useDouyuQualityTranslations()
	const twitchT = useTwitchTranslations()
	const twitchQualityOptions = useTwitchQualityTranslations()
	const pandaT = usePandaTvTranslations()
	const pandaQualityOptions = usePandaTvQualityTranslations()
	const weiboT = useWeiboTranslations()
	const xiaohongshuT = useXiaohongshuTranslations()

	useEffect(() => {
		if (!session?.user?.token) {
			return
		}

		let isMounted = true

		clientBackendFetch<GlobalConfig>("/config", session.user.token)
			.then(data => {
				if (isMounted) {
					setConfig(data)
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

	if (status === "loading" || (session?.user?.token && !config && !error)) {
		return <div className='rounded-lg border p-6 text-sm text-muted-foreground'>{settingsT("loading") || "Loading..."}</div>
	}

	if (!session?.user?.token) {
		return <div className='rounded-lg border border-destructive/30 p-6 text-sm text-destructive'>Session expired</div>
	}

	if (!config || error) {
		return <div className='rounded-lg border border-destructive/30 p-6 text-sm text-destructive'>{error || "Failed to load config"}</div>
	}

	return (
		<PlatformForm
			defaultValues={config}
			huyaStrings={huyaT}
			douyinQualityOptions={douyinQualityOptions}
			douyinStrings={douyinT}
			douyuStrings={douyuT}
			douyuQualityOptions={douyuQualityOptions}
			twitchStrings={twitchT}
			twitchQualityOptions={twitchQualityOptions}
			pandaStrings={pandaT}
			pandaQualityOptions={pandaQualityOptions}
			weiboStrings={weiboT}
			xiaohongshuStrings={xiaohongshuT}
			save={settingsT("save")}
			clientToken={session.user.token}
			onConfigSaved={setConfig}
		/>
	)
}
