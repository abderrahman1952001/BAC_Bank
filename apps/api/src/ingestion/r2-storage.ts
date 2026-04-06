import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import https from 'https';

const DEFAULT_R2_CONNECTION_TIMEOUT_MS = 30_000;
const DEFAULT_R2_SOCKET_TIMEOUT_MS = 180_000;

export type R2Config = {
  accessKeyId: string;
  secretAccessKey: string;
  accountId: string;
  bucketName: string;
  endpoint: string;
};

export function readR2ConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): R2Config {
  const accessKeyId = requiredEnv(env.R2_ACCESS_KEY_ID, 'R2_ACCESS_KEY_ID');
  const secretAccessKey = requiredEnv(
    env.R2_SECRET_ACCESS_KEY,
    'R2_SECRET_ACCESS_KEY',
  );
  const accountId = requiredEnv(env.R2_ACCOUNT_ID, 'R2_ACCOUNT_ID');
  const bucketName = requiredEnv(env.R2_BUCKET_NAME, 'R2_BUCKET_NAME');
  const endpoint = requiredEnv(env.R2_ENDPOINT, 'R2_ENDPOINT');

  return {
    accessKeyId,
    secretAccessKey,
    accountId,
    bucketName,
    endpoint: endpoint.replace(/\/$/, ''),
  };
}

export class R2StorageClient {
  private readonly client: S3Client;

  constructor(private readonly config: R2Config) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      forcePathStyle: true,
      maxAttempts: 5,
      requestHandler: new NodeHttpHandler({
        connectionTimeout: DEFAULT_R2_CONNECTION_TIMEOUT_MS,
        socketTimeout: DEFAULT_R2_SOCKET_TIMEOUT_MS,
        httpsAgent: new https.Agent({
          // Cloudflare R2 is reachable here over IPv4, while Node's
          // dual-stack auto-connect path intermittently times out.
          family: 4,
          keepAlive: true,
          maxSockets: 32,
        }),
      }),
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async putObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
    metadata?: Record<string, string>;
  }) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        Metadata: input.metadata,
      }),
    );

    return {
      key: input.key,
    };
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new Error(`R2 object ${key} is empty.`);
    }

    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }

  async copyObject(input: { sourceKey: string; destinationKey: string }) {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.config.bucketName,
        CopySource: `${this.config.bucketName}/${input.sourceKey}`,
        Key: input.destinationKey,
      }),
    );

    return {
      key: input.destinationKey,
    };
  }

  async deleteObject(key: string) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      }),
    );
  }

  async listObjects(input?: {
    prefix?: string;
    continuationToken?: string;
    maxKeys?: number;
  }) {
    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        Prefix: input?.prefix,
        ContinuationToken: input?.continuationToken,
        MaxKeys: input?.maxKeys,
      }),
    );

    return {
      keys:
        response.Contents?.map((entry) => entry.Key).filter(
          (value): value is string =>
            typeof value === 'string' && value.trim().length > 0,
        ) ?? [],
      nextContinuationToken: response.NextContinuationToken ?? null,
      isTruncated: response.IsTruncated === true,
    };
  }
}

function requiredEnv(value: string | undefined, name: string): string {
  if (!value || !value.trim()) {
    throw new Error(`${name} is required.`);
  }

  return value.trim();
}
