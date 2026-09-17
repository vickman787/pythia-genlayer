export async function fetchWithAuthRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  walletAddress?: string | null
): Promise<Response> {
  let response = await fetch(input, init)
  if (response.status === 401) {
    const address =
      walletAddress ||
      (typeof window !== 'undefined' ? localStorage.getItem('circle_wallet_address') : null)
    if (address) {
      try {
        const loginRes = await fetch('/api/auth/wallet-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: address.toLowerCase() }),
        })
        if (loginRes.ok) {
          response = await fetch(input, init)
        }
      } catch (err) {
        console.warn('Silent auth recovery failed:', err)
      }
    }
  }
  return response
}

export async function readApiJson<T = any>(response: Response): Promise<T> {
  const text = await response.text()

  try {
    return JSON.parse(text) as T
  } catch {
    if (text.trimStart().startsWith('<!DOCTYPE html>')) {
      throw new Error(
        response.status === 404
          ? 'API endpoint was not found. Restart the Next.js development server and try again.'
          : `The server returned an HTML error page (${response.status}). Check the development server terminal.`
      )
    }
    throw new Error(`The server returned an invalid API response (${response.status}).`)
  }
}
