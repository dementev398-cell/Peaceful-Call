import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { File, Storage } from '@google-cloud/storage';
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import {
  canAccessObject,
  getObjectAclPolicy,
  ObjectAclPolicy,
  ObjectPermission,
  setObjectAclPolicy,
} from './objectAcl';

// ---------------------------------------------------------------------------
// Provider selection
// ---------------------------------------------------------------------------

/**
 * Determine which storage backend to use.
 *
 * Rules (first match wins):
 *  1. OBJECT_STORAGE_PROVIDER=gcs-sidecar (or legacy alias 'replit') → GCS sidecar
 *  2. OBJECT_STORAGE_PROVIDER=s3      → S3-compatible
 *  3. REPLIT_DEV_DOMAIN or REPL_ID present → GCS sidecar (auto-detect managed env)
 *  4. default → S3
 */
function resolveProvider(): 'gcs-sidecar' | 's3' {
  const explicit = process.env.OBJECT_STORAGE_PROVIDER;
  // Accept both the new name and the legacy alias for backward compatibility
  if (explicit === 'gcs-sidecar' || explicit === 'replit') return 'gcs-sidecar';
  if (explicit === 's3') return 's3';
  // Auto-detect managed sidecar environment
  if (process.env.REPLIT_DEV_DOMAIN || process.env.REPL_ID) return 'gcs-sidecar';
  return 's3';
}

const PROVIDER = resolveProvider();

// ---------------------------------------------------------------------------
// GCS sidecar backend
// ---------------------------------------------------------------------------

const GCS_SIDECAR_ENDPOINT = 'http://127.0.0.1:1106';

/** Lazily initialised only when the GCS sidecar provider is selected. */
let _gcsSidecarClient: Storage | undefined;

function getGcsSidecarClient(): Storage {
  if (!_gcsSidecarClient) {
    _gcsSidecarClient = new Storage({
      credentials: {
        audience: 'replit',
        subject_token_type: 'access_token',
        token_url: `${GCS_SIDECAR_ENDPOINT}/token`,
        type: 'external_account',
        credential_source: {
          url: `${GCS_SIDECAR_ENDPOINT}/credential`,
          format: {
            type: 'json',
            subject_token_field_name: 'access_token',
          },
        },
        universe_domain: 'googleapis.com',
      },
      projectId: '',
    });
  }
  return _gcsSidecarClient;
}

/**
 * Kept as a named export for any code that directly imported
 * `objectStorageClient` (GCS sidecar path only).
 */
export const objectStorageClient = new Proxy(
  {} as Storage,
  {
    get(_target, prop, receiver) {
      return Reflect.get(getGcsSidecarClient(), prop, receiver);
    },
  },
);

async function gcsSidecarSignObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: 'GET' | 'PUT' | 'DELETE' | 'HEAD';
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${GCS_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL via GCS sidecar, errorcode: ${response.status}. ` +
        `Make sure the GCS sidecar service is running and accessible.`,
    );
  }
  const { signed_url: signedURL } = (await response.json()) as {
    signed_url: string;
  };
  return signedURL;
}

// ---------------------------------------------------------------------------
// S3 backend
// ---------------------------------------------------------------------------

/** Lazily initialised only when the S3 provider is selected. */
let _s3Client: S3Client | undefined;

function getS3Client(): S3Client {
  if (!_s3Client) {
    const region = process.env.S3_REGION;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const endpoint = process.env.S3_ENDPOINT; // optional for non-AWS hosts

    if (!region) throw new Error('S3_REGION env var is required for S3 storage provider');
    if (!accessKeyId) throw new Error('S3_ACCESS_KEY_ID env var is required for S3 storage provider');
    if (!secretAccessKey) throw new Error('S3_SECRET_ACCESS_KEY env var is required for S3 storage provider');

    _s3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });
  }
  return _s3Client;
}

function getS3Bucket(): string {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error('S3_BUCKET env var is required for S3 storage provider');
  return bucket;
}

/** S3 analogue of a GCS File — wraps bucket+key so callers can pass it around. */
export class S3ObjectFile {
  constructor(
    public readonly bucket: string,
    public readonly key: string,
  ) {}

  get name(): string {
    return this.key;
  }
}

async function s3FileExists(file: S3ObjectFile): Promise<boolean> {
  try {
    await getS3Client().send(
      new HeadObjectCommand({ Bucket: file.bucket, Key: file.key }),
    );
    return true;
  } catch {
    return false;
  }
}

async function s3GetSignedUrl(
  file: S3ObjectFile,
  method: 'GET' | 'PUT',
  ttlSec: number,
): Promise<string> {
  const client = getS3Client();
  const command =
    method === 'GET'
      ? new GetObjectCommand({ Bucket: file.bucket, Key: file.key })
      : new PutObjectCommand({ Bucket: file.bucket, Key: file.key });
  return getSignedUrl(client, command, { expiresIn: ttlSec });
}

async function s3DownloadObject(
  file: S3ObjectFile,
  cacheTtlSec: number = 3600,
): Promise<Response> {
  const client = getS3Client();
  const result = await client.send(
    new GetObjectCommand({ Bucket: file.bucket, Key: file.key }),
  );

  const contentType = result.ContentType ?? 'application/octet-stream';
  const isPublic = false; // ACL determined separately via metadata

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Cache-Control': `${isPublic ? 'public' : 'private'}, max-age=${cacheTtlSec}`,
  };
  if (result.ContentLength !== undefined) {
    headers['Content-Length'] = String(result.ContentLength);
  }

  // result.Body is a SdkStream; convert to a Web ReadableStream
  const nodeStream = result.Body as NodeJS.ReadableStream;
  const webStream = Readable.toWeb(
    Readable.from(nodeStream),
  ) as ReadableStream;

  return new Response(webStream, { headers });
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  const pathParts = path.split('/');
  if (pathParts.length < 3) {
    throw new Error('Invalid path: must contain at least a bucket name');
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join('/');
  return { bucketName, objectName };
}

// ---------------------------------------------------------------------------
// Public error class
// ---------------------------------------------------------------------------

export class ObjectNotFoundError extends Error {
  constructor() {
    super('Object not found');
    this.name = 'ObjectNotFoundError';
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Unified ObjectStorageService
// ---------------------------------------------------------------------------

/**
 * Unified storage service. Public method signatures are identical regardless
 * of the active provider (GCS sidecar or S3).
 *
 * In the "gcs-sidecar" provider path it delegates to the GCS sidecar.
 * In the "s3" provider path it uses S3ObjectFile objects which have
 * the same `.name` property used by callers.
 */
export class ObjectStorageService {
  constructor() {}

  // --- Config helpers (same as before) ------------------------------------

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || '';
    const paths = Array.from(
      new Set(
        pathsStr
          .split(',')
          .map((p) => p.trim())
          .filter((p) => p.length > 0),
      ),
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          'tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths).',
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || '';
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          'tool and set PRIVATE_OBJECT_DIR env var.',
      );
    }
    return dir;
  }

  // --- Public-object search -----------------------------------------------

  async searchPublicObject(filePath: string): Promise<File | S3ObjectFile | null> {
    if (PROVIDER === 's3') {
      const bucket = getS3Bucket();
      for (const searchPath of this.getPublicObjectSearchPaths()) {
        const key = `${searchPath.replace(/^\//, '')}/${filePath}`;
        const file = new S3ObjectFile(bucket, key);
        if (await s3FileExists(file)) return file;
      }
      return null;
    }

    // GCS sidecar path
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = getGcsSidecarClient().bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      if (exists) return file;
    }
    return null;
  }

  // --- Download -----------------------------------------------------------

  async downloadObject(
    file: File | S3ObjectFile,
    cacheTtlSec: number = 3600,
  ): Promise<Response> {
    if (file instanceof S3ObjectFile) {
      return s3DownloadObject(file, cacheTtlSec);
    }

    // GCS sidecar path
    const [metadata] = await (file as File).getMetadata();
    const aclPolicy = await getObjectAclPolicy(file as File);
    const isPublic = aclPolicy?.visibility === 'public';

    const nodeStream = (file as File).createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const headers: Record<string, string> = {
      'Content-Type':
        (metadata.contentType as string) || 'application/octet-stream',
      'Cache-Control': `${isPublic ? 'public' : 'private'}, max-age=${cacheTtlSec}`,
    };
    if (metadata.size) {
      headers['Content-Length'] = String(metadata.size);
    }
    return new Response(webStream, { headers });
  }

  // --- Upload URL ---------------------------------------------------------

  async getObjectEntityUploadURL(): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    const objectId = randomUUID();

    if (PROVIDER === 's3') {
      const bucket = getS3Bucket();
      const key = `${privateObjectDir.replace(/^\//, '')}/uploads/${objectId}`;
      const file = new S3ObjectFile(bucket, key);
      return s3GetSignedUrl(file, 'PUT', 900);
    }

    // GCS sidecar path
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    return gcsSidecarSignObjectURL({ bucketName, objectName, method: 'PUT', ttlSec: 900 });
  }

  // --- Entity file lookup -------------------------------------------------

  async getObjectEntityFile(objectPath: string): Promise<File | S3ObjectFile> {
    if (!objectPath.startsWith('/objects/')) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split('/');
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join('/');
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith('/')) entityDir = `${entityDir}/`;

    if (PROVIDER === 's3') {
      const bucket = getS3Bucket();
      const key = `${entityDir.replace(/^\//, '')}${entityId}`;
      const file = new S3ObjectFile(bucket, key);
      if (!(await s3FileExists(file))) throw new ObjectNotFoundError();
      return file;
    }

    // GCS sidecar path
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = getGcsSidecarClient().bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) throw new ObjectNotFoundError();
    return objectFile;
  }

  // --- Path normalization -------------------------------------------------

  normalizeObjectEntityPath(rawPath: string): string {
    if (PROVIDER === 's3') {
      // For S3, the "upload URL" is a presigned HTTPS URL.  Normalise it to
      // /objects/<key> so the client stores a stable internal path.
      try {
        const url = new URL(rawPath);
        // presigned S3 URL pathname is /<bucket>/<key> or just /<key>
        const bucket = getS3Bucket();
        let pathname = decodeURIComponent(url.pathname);
        // Strip leading /<bucket>/ if present (path-style URL)
        const bucketPrefix = `/${bucket}/`;
        if (pathname.startsWith(bucketPrefix)) {
          pathname = pathname.slice(bucketPrefix.length);
        } else if (pathname.startsWith('/')) {
          pathname = pathname.slice(1);
        }
        let entityDir = this.getPrivateObjectDir().replace(/^\//, '');
        if (!entityDir.endsWith('/')) entityDir = `${entityDir}/`;
        if (pathname.startsWith(entityDir)) {
          const entityId = pathname.slice(entityDir.length);
          return `/objects/${entityId}`;
        }
        return `/${pathname}`;
      } catch {
        return rawPath;
      }
    }

    // GCS sidecar path
    if (!rawPath.startsWith('https://storage.googleapis.com/')) {
      return rawPath;
    }
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;

    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith('/')) {
      objectEntityDir = `${objectEntityDir}/`;
    }
    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  // --- ACL helpers --------------------------------------------------------

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith('/')) {
      return normalizedPath;
    }

    if (PROVIDER === 's3') {
      // S3 does not use the GCS ACL metadata system; no-op and return path.
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile as File, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File | S3ObjectFile;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    if (objectFile instanceof S3ObjectFile) {
      // S3: no ACL metadata system implemented; default to owner-only.
      // Callers should implement their own access control layer.
      return false;
    }
    return canAccessObject({
      userId,
      objectFile: objectFile as File,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}
