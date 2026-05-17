import createMiddleware from "next-intl/middleware"
import { localePrefix, routing } from "@/src/i18n/routing"

const intlMiddleware = createMiddleware({
	// A list of all locales that are supported
	locales: routing.locales,
	localePrefix: localePrefix,
	// Used when no locale matches
	defaultLocale: "en",
})

export default intlMiddleware

export const config = {
	matcher: ["/((?!api|_next|.*\\..*).*)"],
}
