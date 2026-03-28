import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { v2 as cloudinary } from 'cloudinary';

const CLOUDINARY_BASE_FOLDER = process.env.CLOUDINARY_FOLDER || 'paris1esport';

type ImageCategory = 'org-members' | 'partners' | 'events';

const LOCAL_UPLOAD_DIRS: Record<ImageCategory, string[]> = {
  'org-members': ['public', 'photos', 'org'],
  partners: ['public', 'logos', 'partners'],
  events: ['public', 'photos', 'events']
};

const LOCAL_PUBLIC_PREFIX: Record<ImageCategory, string> = {
  'org-members': '/photos/org',
  partners: '/logos/partners',
  events: '/photos/events'
};

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

async function uploadToCloudinaryInCategory(file: File, category: ImageCategory): Promise<string> {
  configureCloudinary();
  const buffer = Buffer.from(await file.arrayBuffer());
  const folder = `${CLOUDINARY_BASE_FOLDER}/${category}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image'
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(error || new Error('Cloudinary upload failed.'));
          return;
        }
        resolve(result.secure_url);
      }
    );

    stream.end(buffer);
  });
}

async function saveLocally(file: File, category: ImageCategory): Promise<string> {
  const uploadDir = path.join(process.cwd(), ...LOCAL_UPLOAD_DIRS[category]);
  await fs.mkdir(uploadDir, { recursive: true });
  const extension = path.extname(file.name) || '.jpg';
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(uploadDir, fileName), buffer);
  return `${LOCAL_PUBLIC_PREFIX[category]}/${fileName}`;
}

async function storeImageByCategory(file: File, category: ImageCategory): Promise<string> {
  if (isCloudinaryConfigured()) {
    return uploadToCloudinaryInCategory(file, category);
  }

  return saveLocally(file, category);
}

export async function storeOrgPhoto(file: File): Promise<string> {
  return storeImageByCategory(file, 'org-members');
}

export async function storePartnerLogo(file: File): Promise<string> {
  return storeImageByCategory(file, 'partners');
}

export async function storeEventPhoto(file: File): Promise<string> {
  return storeImageByCategory(file, 'events');
}

export function getPhotoStorageMode() {
  return isCloudinaryConfigured() ? 'cloudinary' : 'local';
}
