import { promises as fs } from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

const ROOT = process.cwd();
const BASE_FOLDER = process.env.CLOUDINARY_FOLDER || 'paris1esport';

function parseEnvContent(content) {
  const vars = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const idx = trimmed.indexOf('=');
    if (idx === -1) {
      continue;
    }

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

async function loadEnvIfPresent(fileName) {
  const envPath = path.join(ROOT, fileName);
  try {
    const content = await fs.readFile(envPath, 'utf-8');
    const vars = parseEnvContent(content);
    for (const [key, value] of Object.entries(vars)) {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // File not present: ignore.
  }
}

function ensureCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary variables are missing. Define CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.');
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
}

function isRemoteUrl(value) {
  return /^https?:\/\//i.test(value);
}

function isPublicRelativePath(value) {
  return typeof value === 'string' && value.startsWith('/');
}

function localPathFromPublicRef(ref) {
  return path.join(ROOT, 'public', ref.replace(/^\//, ''));
}

async function uploadFileToCloudinary(localFilePath, folder) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      localFilePath,
      {
        folder,
        resource_type: 'image',
        use_filename: true,
        unique_filename: true,
        overwrite: false
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(error || new Error('Cloudinary upload failed'));
          return;
        }
        resolve(result.secure_url);
      }
    );
  });
}

async function readJson(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fileSize(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch {
    return 0;
  }
}

async function migratePublicRef(ref, folder, cache, migratedRefs) {
  if (!isPublicRelativePath(ref) || isRemoteUrl(ref)) {
    return ref;
  }

  const cacheKey = `${folder}|${ref}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const localFile = localPathFromPublicRef(ref);
  if (!(await fileExists(localFile))) {
    console.warn(`[warn] File not found for ${ref} (${localFile})`);
    cache.set(cacheKey, ref);
    return ref;
  }

  const size = await fileSize(localFile);
  if (size <= 0) {
    console.warn(`[warn] File is empty for ${ref} (${localFile})`);
    cache.set(cacheKey, ref);
    return ref;
  }

  try {
    const uploadedUrl = await uploadFileToCloudinary(localFile, folder);
    cache.set(cacheKey, uploadedUrl);
    migratedRefs.set(ref, uploadedUrl);
    console.log(`[ok] ${ref} -> ${uploadedUrl}`);
    return uploadedUrl;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[warn] Upload failed for ${ref}: ${message}`);
    cache.set(cacheKey, ref);
    return ref;
  }
}

async function replaceRefsInTsFile(filePath, migratedRefs) {
  if (migratedRefs.size === 0) {
    return;
  }

  const content = await fs.readFile(filePath, 'utf-8');
  let next = content;

  for (const [from, to] of migratedRefs.entries()) {
    next = next.split(from).join(to);
  }

  if (next !== content) {
    await fs.writeFile(filePath, next, 'utf-8');
    console.log(`[ok] Updated refs in ${path.relative(ROOT, filePath)}`);
  }
}

async function main() {
  await loadEnvIfPresent('.env');
  await loadEnvIfPresent('.env.local');
  ensureCloudinaryConfig();

  const dataDir = path.join(ROOT, 'data');
  const orgPath = path.join(dataDir, 'org-members.json');
  const eventsPath = path.join(dataDir, 'events.json');
  const partnersPath = path.join(dataDir, 'partners.json');

  const orgMembers = await readJson(orgPath);
  const events = await readJson(eventsPath);
  const partners = await readJson(partnersPath);

  const cache = new Map();
  const migratedRefs = new Map();

  for (const member of orgMembers) {
    if (member?.photo) {
      member.photo = await migratePublicRef(member.photo, `${BASE_FOLDER}/org-members`, cache, migratedRefs);
    }
  }

  for (const event of events) {
    if (Array.isArray(event?.photos)) {
      const nextPhotos = [];
      for (const ref of event.photos) {
        nextPhotos.push(await migratePublicRef(ref, `${BASE_FOLDER}/events`, cache, migratedRefs));
      }
      event.photos = nextPhotos;
    }
  }

  for (const partner of partners) {
    if (partner?.logo) {
      partner.logo = await migratePublicRef(partner.logo, `${BASE_FOLDER}/partners`, cache, migratedRefs);
    }
  }

  await writeJson(orgPath, orgMembers);
  await writeJson(eventsPath, events);
  await writeJson(partnersPath, partners);

  await replaceRefsInTsFile(path.join(ROOT, 'src', 'lib', 'orgDefaults.ts'), migratedRefs);
  await replaceRefsInTsFile(path.join(ROOT, 'src', 'lib', 'data.ts'), migratedRefs);

  console.log('---');
  console.log(`Migration finished. Uploaded/updated refs: ${migratedRefs.size}`);
}

main().catch((error) => {
  console.error('[error] Migration failed:', error.message || error);
  process.exit(1);
});
