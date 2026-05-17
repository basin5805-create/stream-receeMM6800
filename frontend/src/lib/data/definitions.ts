const serverApiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:12555/api"
const browserApiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:12555/api"

export const API_URL = typeof window === "undefined" ? serverApiUrl : browserApiUrl

export const jsonHeaders = {
	"Content-Type": "application/json",
	Accept: "application/json, text/plain, */*",
}
