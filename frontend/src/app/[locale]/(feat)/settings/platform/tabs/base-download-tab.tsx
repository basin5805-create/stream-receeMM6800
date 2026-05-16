import { Control } from "react-hook-form"
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/src/components/new-york/ui/form"
import React from "react"
import { Input } from "@/src/components/new-york/ui/input"
import { Button } from "@/src/components/new-york/ui/button"
import { OutputFilenameFormfield } from "@/src/app/[locale]/(feat)/settings/components/form/output-filename-formfield"
import { OutputFileFormatFormfield } from "@/src/app/[locale]/(feat)/settings/components/form/output-file-format-formfield"
import { OutputFolderFormField } from "@/src/app/[locale]/(feat)/settings/components/form/output-folder-formfield"
import { DanmuFlagFormfield } from "@/src/app/[locale]/(feat)/settings/components/form/danmu-flag-formfield"
import { CookiesFormfield } from "@/src/app/[locale]/(feat)/settings/components/form/cookies-formfield"

type BaseDownloadTabProps = {
	controlPrefix?: string
	control: Control<any>
	showDanmu?: boolean
	showCookies?: boolean
	showMaxBitrate?: boolean
	allowNone?: boolean
	strings: BaseDownloadTabString
}

export type BaseDownloadTabString = {
	danmu: string
	danmuDescription: string
	cookies: string
	cookiesDescription: string
	maxBitrate: string
	maxBitrateDescription: string
	outputFolder: string
	outputFolderDescription: string | React.ReactNode
	outputFolderPlaceholderDescription: string | React.ReactNode
	outputFilename: string
	outputFilenameDescription: string | React.ReactNode
	outputFileFormat: string
	outputFileFormatDescription: string | React.ReactNode
}

export function BaseDownloadTab({
	controlPrefix = "downloadConfig",
	control,
	strings,
	showDanmu = true,
	showCookies = true,
	showMaxBitrate = true,
	allowNone = false,
}: BaseDownloadTabProps) {
	const bitratePresets = [
		{ label: "360p", value: 1200 },
		{ label: "480p", value: 2000 },
		{ label: "720p", value: 3500 },
		{ label: "1080p", value: 6000 },
		{ label: "1080p+", value: 8000 },
		{ label: "原画上限", value: 10000 },
	] as const

	return (
		<>
			<div className='mt-6 space-y-6'>
				{showDanmu && (
					<DanmuFlagFormfield
						controlPrefix={controlPrefix}
						control={control}
						title={strings.danmu}
						description={strings.danmuDescription}
					/>
				)}
				{showCookies && (
					<CookiesFormfield
						title={strings.cookies}
						description={strings.cookiesDescription}
						name={controlPrefix ? `${controlPrefix}.cookies` : "cookies"}
						control={control}
					/>
				)}
				{showMaxBitrate && (
					<FormField
						control={control}
						name={controlPrefix ? `${controlPrefix}.maxBitRate` : "maxBitRate"}
						render={({ field }) => (
							<FormItem>
								<FormLabel>{strings.maxBitrate}</FormLabel>
								<FormControl>
									<div className='space-y-3'>
										<Input
											placeholder='10000'
											type='number'
											step={100}
											value={field.value}
											onChange={event => {
												if (event.target.value === "") {
													field.onChange(null)
												} else {
													field.onChange(parseInt(event.target.value))
												}
											}}
										/>
										<div className='flex flex-wrap gap-2'>
											{bitratePresets.map(preset => (
												<Button
													key={preset.label}
													type='button'
													variant={field.value === preset.value ? "default" : "outline"}
													size='sm'
													onClick={() => field.onChange(preset.value)}
												>
													{preset.label} {preset.value}
												</Button>
											))}
										</div>
										<p className='text-[0.8rem] text-muted-foreground'>
											这里填的是目标码率，不是分辨率。对小红书当前这条直录链路来说，它更接近偏好值，不保证一定录成 720p。
										</p>
									</div>
								</FormControl>
								<FormDescription>{strings.maxBitrateDescription}</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}

				<OutputFolderFormField
					control={control}
					controlPrefix={controlPrefix}
					name={strings.outputFolder}
					description={strings.outputFolderDescription}
					placeholderDescription={strings.outputFolderPlaceholderDescription}
				/>
				<OutputFilenameFormfield
					control={control}
					controlPrefix={controlPrefix}
					name={strings.outputFilename}
					description={strings.outputFilenameDescription}
				/>
				<OutputFileFormatFormfield
					control={control}
					controlPrefix={controlPrefix}
					name={strings.outputFileFormat}
					description={strings.outputFileFormatDescription}
					allowNull={allowNone}
				/>
			</div>
		</>
	)
}
