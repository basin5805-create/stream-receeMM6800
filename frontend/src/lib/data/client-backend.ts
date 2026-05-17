"use client"

import { API_URL, jsonHeaders } from "@/src/lib/data/definitions"

async function parseError(response: Response) {
	try {
		return await response.text()
	} catch {
		return response.statusText
	}
}

export async function clientBackendFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${API_URL}${path}`, {
		...init,
		headers: {
			...jsonHeaders,
			Authorization: `Bearer ${token}`,
			...(init?.headers || {}),
		},
	})

	if (!response.ok) {
		throw new Error(`${response.status} ${await parseError(response)}`)
	}

	if (response.status === 204) {
		return undefined as T
	}

	return (await response.json()) as T
}
