const path = require('path');
const dotenv = require('dotenv');

// Load backend .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const POCKET_HOST_URL = process.env.POCKET_HOST_URL;
const RAW_TOKEN = process.env.POCKET_HOST_TOKEN || '';
const POCKET_HOST_USER_ID = Number(process.env.POCKET_HOST_USER_ID || 2);

const title = process.argv[2] || 'Big Match';
const content = process.argv[3] || 'Thai v.s. Turk';
const userId = Number(process.argv[4] || POCKET_HOST_USER_ID);

function buildAuthHeader(token) {
  if (!token) return undefined;
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
}

async function main() {
  if (!POCKET_HOST_URL) {
    throw new Error('Missing POCKET_HOST_URL in backend/.env');
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  const authHeader = buildAuthHeader(RAW_TOKEN);
  if (authHeader) {
    headers.Authorization = authHeader;
  }

  const body = {
    title,
    content,
    user_id: userId,
  };

  const response = await fetch(POCKET_HOST_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`PocketHost POST failed (${response.status}): ${JSON.stringify(data)}`);
  }

  console.log('Created note successfully:');
  console.log(JSON.stringify(data, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
