"use server"

import { API_URL, jsonHeaders } from "@/src/lib/data/definitions"

const readErrorText = async (response: Response) => {
	try {
		return await response.text()
	} catch {
		return ""
	}
}

export const login = async (username: string, password: string) => {
	const response = await fetch(`${API_URL}/auth/login`, {
		method: "POST",
		headers: {
			...jsonHeaders,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ username, password: password }),
	})

	if (!response.ok) {
		const errorText = await readErrorText(response)
		throw new Error("Login failed, status: " + response.status + " " + errorText)
	}
	return (await response.json()) as {
		id: number
		token: string
		validTo: number
		// TODO : Remove undefined in next versions
		isFirstUsePassword: boolean | undefined
		role: string | undefined
	}
}

export const recoverPassword = async (username: string) => {
	const response = await fetch(`${API_URL}/auth/recover`, {
		method: "POST",
		headers: {
			...jsonHeaders,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ username }),
	})

	if (!response.ok) {
		const errorText = await readErrorText(response)
		throw new Error("Recover password failed, status: " + response.status + " " + errorText)
	}
	return await response.text()
}

export const changePassword = async (id: string, password: string, newPassword: string) => {
	const { auth } = await import("@/auth")
	const session = await auth()
	const headers: HeadersInit = {
		...jsonHeaders,
		"Content-Type": "application/json",
	}

	if (session?.user?.token) {
		headers["Authorization"] = `Bearer ${session.user.token}`
	}

	const response = await fetch(`${API_URL}/user/${id}/password`, {
		method: "PUT",
		headers,
		body: JSON.stringify({
			id,
			password: password.trim(),
			newPassword: newPassword,
		}),
	})

	if (!response.ok) {
		const errorText = await readErrorText(response)
		throw new Error("Change password failed, status: " + response.status + " " + errorText)
	}
	return await response.text()
}
