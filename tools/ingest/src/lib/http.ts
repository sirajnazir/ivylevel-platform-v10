import fetch from "node-fetch";

export async function postJson(url: string, body: any, token?: string, retries=5, backoff=500) {
  for (let i=0;i<retries;i++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body),
    });
    if (res.ok) return await res.json().catch(()=> ({}));
    const text = await res.text();
    await new Promise(r => setTimeout(r, backoff * (i+1)));
    if (i === retries-1) throw new Error(`[postJson] ${res.status} ${text}`);
  }
}