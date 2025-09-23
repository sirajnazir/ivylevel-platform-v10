import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

export const s3 = new S3Client({});
export const ses = new SESv2Client({});
export const secrets = new SecretsManagerClient({});

export async function putS3(bucket: string, key: string, body: Uint8Array | string) {
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }));
}

export async function sendEmail(params: { from:string; to:string[]; subject:string; html:string; configurationSetName?:string; }) {
  const cmd = new SendEmailCommand({
    FromEmailAddress: params.from,
    Destination: { ToAddresses: params.to },
    Content: { Simple: { Subject: { Data: params.subject }, Body: { Html: { Data: params.html } } } },
    ConfigurationSetName: params.configurationSetName
  });
  return ses.send(cmd);
}

export async function getSecret(name: string): Promise<string> {
  const out = await secrets.send(new GetSecretValueCommand({ SecretId: name }));
  return out.SecretString || "";
}
