import type { Env } from './_db.js';
import { awsJsonRequest } from './_aws-request.js';

export type InfrastructureJob = { version: 1; type: 'infra.healthcheck' | 'backup.snapshot'; id: string };
export async function enqueueInfrastructureJob(env: Env, job: InfrastructureJob): Promise<{ MessageId: string }> {
  const queue = 'https://sqs.eu-central-1.amazonaws.com/579505322330/urefy-async-jobs';
  if (env.AWS_SQS_QUEUE_URL !== queue || job.version !== 1 || !['infra.healthcheck', 'backup.snapshot'].includes(job.type) || !/^[A-Za-z0-9_-]{8,80}$/.test(job.id) || Object.keys(job).length !== 3) {
    throw new Error('Invalid infrastructure job or queue.');
  }
  return awsJsonRequest(env, 'sqs', { QueueUrl: queue, MessageBody: JSON.stringify(job) }, 'AmazonSQS.SendMessage');
}
