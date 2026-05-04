import { list, put } from '@vercel/blob';

const DATA_PATH = 'fcmm/dashboard-data.json';

function json(body, init = {}) {
const headers = new Headers(init.headers || {});
headers.set('Cache-Control', 'no-store');
return Response.json(body, { ...init, headers });
}

export async function GET() {
try {
const { blobs } = await list({ prefix: DATA_PATH, limit: 10 });
const match = blobs.find(blob => blob.pathname === DATA_PATH);
if (!match) {
return json({ error: 'No shared dashboard data found yet.' }, { status: 404 });
}

const response = await fetch(match.url, { cache: 'no-store' });
if (!response.ok) {
return json({ error: 'Stored dashboard data could not be read.' }, { status: 500 });
}

const payload = await response.json();
return json({
data: payload?.data || null,
updatedAt: payload?.updatedAt || null
});
} catch (error) {
console.error('GET /api/dashboard-data failed:', error);
return json({ error: 'Could not load shared dashboard data.' }, { status: 500 });
}
}

export async function POST(request) {
try {
const payload = await request.json();
if (!payload || typeof payload !== 'object' || !payload.data || payload.data.type !== 'folder') {
return json({ error: 'Invalid dashboard payload.' }, { status: 400 });
}

await put(
DATA_PATH,
JSON.stringify({
data: payload.data,
updatedAt: new Date().toISOString()
}),
{
access: 'public',
addRandomSuffix: false,
overwrite: true,
contentType: 'application/json',
cacheControlMaxAge: 0
}
);

return json({ ok: true });
} catch (error) {
console.error('POST /api/dashboard-data failed:', error);
return json({ error: 'Could not save shared dashboard data.' }, { status: 500 });
}
}