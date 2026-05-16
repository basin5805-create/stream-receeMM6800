import React from "react"
import {
	PlatformTabContent,
	PlatformTabContentProps,
} from "@/src/app/[locale]/(feat)/settings/platform/tabs/common-platform-tab"
import { XiaohongshuTabString } from "@/src/app/hooks/translations/xiaohongshu-translations"

type XiaohongshuConfigProps = PlatformTabContentProps<XiaohongshuTabString>

export const XiaohongshuTabContent = ({
	controlPrefix,
	control,
	showFetchDelay,
	showCookies,
	showPartedDownloadRetry,
	showDownloadCheckInterval,
	strings,
}: XiaohongshuConfigProps) => {
	return (
		<PlatformTabContent
			control={control}
			controlPrefix={controlPrefix}
			showCookies={showCookies}
			showPartedDownloadRetry={showPartedDownloadRetry}
			showFetchDelay={showFetchDelay}
			showDownloadCheckInterval={showDownloadCheckInterval}
			strings={strings}
		/>
	)
}
