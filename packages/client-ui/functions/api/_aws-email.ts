import type { Env } from './_db.js';
import { awsJsonRequest } from './_aws-request.js';

/** For explicitly consented transactional email; never pass DM text or keys. */
export async function sendTransactionalEmail(env: Env, message: { to: string; subject: string; text: string; consent: true }): Promise<{ MessageId: string }> {
  if (message.consent !== true || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.to) || message.to.length > 254 ||
      !message.subject || message.subject.length > 160 || /[\r\n]/.test(message.subject) || !message.text || message.text.length > 10000) {
    throw new Error('Invalid or unconsented transactional email.');
  }
  return awsJsonRequest(env, 'ses', {
    FromEmailAddress: 'UREfy <notifications@urefy.com>',
    Destination: { ToAddresses: [message.to] },
    Content: { Simple: { Subject: { Data: message.subject, Charset: 'UTF-8' }, Body: { Text: { Data: message.text, Charset: 'UTF-8' } } } },
  });
}
