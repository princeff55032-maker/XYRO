/**
 * Checks if a password has appeared in any data breaches using the
 * HaveIBeenPwned (HIBP) k-Anonymity API.
 * 
 * Only the first 5 characters of the SHA-1 hash are sent over the network,
 * ensuring the plain-text password is never exposed.
 */
export async function isPasswordPwned(password: string): Promise<{ isPwned: boolean; breachCount: number }> {
  try {
    // 1. Calculate SHA-1 hash of the password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();

    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    // 2. Query HIBP range API with the 5-char prefix
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: "GET",
      headers: { "Add-Padding": "true" },
      cache: "no-store",
    });

    if (!res.ok) {
      // If HIBP service is unavailable, fail open gracefully
      return { isPwned: false, breachCount: 0 };
    }

    const text = await res.text();
    const lines = text.split("\n");

    for (const line of lines) {
      const [hashSuffix, countStr] = line.trim().split(":");
      if (hashSuffix && hashSuffix.toUpperCase() === suffix) {
        const breachCount = parseInt(countStr, 10) || 1;
        return { isPwned: true, breachCount };
      }
    }

    return { isPwned: false, breachCount: 0 };
  } catch {
    // If network or crypto fails, allow fallback
    return { isPwned: false, breachCount: 0 };
  }
}
