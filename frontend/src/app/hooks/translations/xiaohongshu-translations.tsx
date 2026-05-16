import { useTranslations } from "next-intl"
import React, { useMemo } from "react"
import { PlatformTabContentStrings } from "@/src/app/[locale]/(feat)/settings/platform/tabs/common-platform-tab"
import { useBaseGlobalPlatformTranslations } from "@/src/app/hooks/translations/base-global-platform-translation"
import RichText from "@/src/components/i18n/RichText"

export type XiaohongshuTabString = PlatformTabContentStrings

export const useXiaohongshuTranslations = () => {
	const t = useTranslations("Xiaohongshu")
	const baseTranslations = useBaseGlobalPlatformTranslations()

	return useMemo<XiaohongshuTabString>(
		() =>
			({
				...baseTranslations,
				platform: t("platform"),
				cookieDescription: <RichText>{tags => t.rich("cookieDescription", tags)}</RichText>,
			}) as XiaohongshuTabString,
		[t, baseTranslations]
	)
}
