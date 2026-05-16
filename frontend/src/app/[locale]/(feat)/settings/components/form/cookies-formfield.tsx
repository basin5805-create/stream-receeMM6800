import { UseControllerProps } from "react-hook-form"
import React, { ReactElement } from "react"
import { AutosizeTextarea } from "@/src/components/new-york/ui/autosize-textarea"
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/src/components/new-york/ui/form"

type CookiesFormfieldProps = {
	title: string
	description: string | React.ReactNode
	onChange?: (value: string | null) => void
} & UseControllerProps

export type CookiesFormfieldRef = {
	element: ReactElement
}

export const CookiesFormfield = React.forwardRef<CookiesFormfieldRef, CookiesFormfieldProps>(
	(
		{ title, description, control, name, onChange, ...props }: CookiesFormfieldProps,
		ref: React.Ref<CookiesFormfieldRef>
	) => {
		type CookieExportItem = {
			name?: unknown
			value?: unknown
		}

		function extractCookiesFromJson(cookieString: string): Record<string, string> | null {
			const trimmed = cookieString.trim()
			if (!(trimmed.startsWith("[") || trimmed.startsWith("{"))) {
				return null
			}

			try {
				const parsed = JSON.parse(trimmed)
				const cookies: Record<string, string> = {}
				const cookieItems = Array.isArray(parsed)
					? parsed
					: Array.isArray((parsed as { cookies?: unknown }).cookies)
						? ((parsed as { cookies: CookieExportItem[] }).cookies ?? [])
						: []

				cookieItems.forEach((item: CookieExportItem) => {
					if (typeof item?.name === "string" && typeof item?.value === "string" && item.name.trim() !== "") {
						cookies[item.name.trim()] = item.value
					}
				})

				return Object.keys(cookies).length > 0 ? cookies : null
			} catch {
				return null
			}
		}

		function extractCookies(cookieString: string): Record<string, string> {
			if (!cookieString) {
				return {}
			}

			const cookiesFromJson = extractCookiesFromJson(cookieString)
			if (cookiesFromJson) {
				return cookiesFromJson
			}

			const cookies: Record<string, string> = {}
			const cookieArray = cookieString.split(";")

			cookieArray.forEach(cookie => {
				const separatorIndex = cookie.indexOf("=")
				if (separatorIndex !== -1) {
					const key = cookie.substring(0, separatorIndex).trim()
					cookies[key] = cookie.substring(separatorIndex + 1).trim()
				}
			})

			return cookies
		}

		return (
			<FormField
				control={control}
				name={name ?? "cookies"}
				render={({ field }) => (
					<FormItem>
						<FormLabel>{title}</FormLabel>
						<FormControl>
							<AutosizeTextarea
								id={name ?? "cookies"}
								placeholder='Cookies'
								{...field}
								onChange={e => {
									const value = e.target.value
									if (value === "") {
										field.onChange(null)
										onChange?.(null)
									} else {
										const cookies = extractCookies(value)
										// transform the cookies into a string
										const cookieString = Object.entries(cookies)
											.map(([key, value]) => `${key}=${value}`)
											.join("; ")
										field.onChange(cookieString)
										onChange?.(cookieString)
									}
								}}
							/>
						</FormControl>
						<FormDescription>{description}</FormDescription>
						<FormMessage />
					</FormItem>
				)}
			/>
		)
	}
)
CookiesFormfield.displayName = "CookiesFormfield"
