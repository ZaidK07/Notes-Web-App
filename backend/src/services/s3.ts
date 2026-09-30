import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import path from 'path';
import { Readable } from 'stream';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const s3Endpoint = process.env.S3_ENDPOINT || '';
const s3Region = process.env.S3_REGION || 'us-east-005';
const s3Bucket = process.env.S3_BUCKET || '';
const accessKeyId = process.env.S3_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || '';

export const s3Client = new S3Client({
  endpoint: s3Endpoint || undefined,
  region: s3Region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true,
});

const presignedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Generates an authorized presigned GET download URL for private bucket objects
 */
export async function createPresignedDownloadUrl(
  fileKey: string,
  expiresInSeconds = 604800 // 7 days
): Promise<string> {
  const now = Date.now();
  const cached = presignedUrlCache.get(fileKey);
  if (cached && cached.expiresAt > now + 3600000) {
    return cached.url;
  }

  if (!s3Bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('S3 credentials are not configured');
  }

  const command = new GetObjectCommand({
    Bucket: s3Bucket,
    Key: fileKey,
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: expiresInSeconds,
  });

  presignedUrlCache.set(fileKey, {
    url,
    expiresAt: now + expiresInSeconds * 1000,
  });

  return url;
}

/**
 * Fetches an object stream directly from S3 using server credentials
 */
export async function getObjectFromS3(fileKey: string): Promise<{
  stream: Readable;
  contentType: string;
  contentLength?: number;
}> {
  if (!s3Bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('S3 credentials are not configured');
  }

  const command = new GetObjectCommand({
    Bucket: s3Bucket,
    Key: fileKey,
  });

  const response = await s3Client.send(command);
  return {
    stream: response.Body as Readable,
    contentType: response.ContentType || 'image/png',
    contentLength: response.ContentLength,
  };
}

/**
 * Uploads a buffer directly to S3
 */
export async function uploadToS3(params: {
  key: string;
  body: Buffer | Uint8Array;
  mimeType: string;
}): Promise<{ fileKey: string }> {
  if (!s3Bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('S3 credentials are not configured');
  }

  const command = new PutObjectCommand({
    Bucket: s3Bucket,
    Key: params.key,
    Body: params.body,
    ContentType: params.mimeType,
  });

  await s3Client.send(command);

  return {
    fileKey: params.key,
  };
}

/**
 * Generates a presigned URL for direct client-side S3 upload
 */
export async function createPresignedUploadUrl(
  fileKey: string,
  mimeType: string,
  expiresInSeconds = 3600
): Promise<{ uploadUrl: string; fileKey: string }> {
  if (!s3Bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('S3 credentials are not configured');
  }

  const command = new PutObjectCommand({
    Bucket: s3Bucket,
    Key: fileKey,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: expiresInSeconds,
  });

  return {
    uploadUrl,
    fileKey,
  };
}

/**
 * Deletes an object from S3
 */
export async function deleteFromS3(fileKey: string): Promise<boolean> {
  if (!s3Bucket || !accessKeyId || !secretAccessKey) {
    return false;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: s3Bucket,
      Key: fileKey,
    });
    await s3Client.send(command);
    return true;
  } catch (error: any) {
    console.error('Error deleting object from S3:', error.message);
    return false;
  }
}

/**
 * Tests connection to S3 bucket
 */
export async function checkS3Health(): Promise<{ status: 'connected' | 'unconfigured' | 'error'; message: string }> {
  if (!s3Bucket || !accessKeyId || !secretAccessKey) {
    return {
      status: 'unconfigured',
      message: 'S3 credentials not set in .env',
    };
  }

  try {
    const command = new HeadBucketCommand({ Bucket: s3Bucket });
    await s3Client.send(command);
    return {
      status: 'connected',
      message: `Successfully connected to bucket "${s3Bucket}"`,
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: `S3 connection failed: ${error.message}`,
    };
  }
}
