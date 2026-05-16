import { getTranslations } from "next-intl/server"
import { SettingsPage } from "@/src/app/[locale]/(feat)/settings/components/pages"
import PlatformClientPage from "@/src/app/[locale]/(feat)/settings/platform/platform-client-page"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "Metadata" })

	return {
		title: t("title"),
	}
}

export default function SettingsPlatformPage() {
	return (
		<SettingsPage>
			<PlatformClientPage />
		</SettingsPage>
	)
}
