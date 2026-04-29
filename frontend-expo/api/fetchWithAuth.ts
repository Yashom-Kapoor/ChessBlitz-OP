import { getJwt } from "./Auth";

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    let jwt = await getJwt()
    return fetch(url, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${jwt}`}
    })
}