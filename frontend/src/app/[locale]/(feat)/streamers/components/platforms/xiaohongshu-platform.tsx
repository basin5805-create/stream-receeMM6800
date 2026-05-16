import { useFormContext } from "react-hook-form"
import React from "react"
import { XiaohongshuTabContent } from "@/src/app/[locale]/(feat)/settings/platform/tabs/xiaohongshu-tab"
import { XiaohongshuTabString } from "@/src/app/hooks/translations/xiaohongshu-translations"

type XiaohongshuPlatformFormProps = {
	allowNone?: boolean
	strings: XiaohongshuTabString
}

export const XiaohongshuPlatformForm = ({ strings }: XiaohongshuPlatformFormProps) => {
	const form = useFormContext()

	return (
		<XiaohongshuTabContent
			controlPrefix={"downloadConfig"}
			control={form.control}
			showCookies={false}
			strings={strings}
		/>
	)
}
