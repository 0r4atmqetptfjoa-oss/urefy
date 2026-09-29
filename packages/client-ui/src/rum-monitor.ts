import { AwsRum, type AwsRumConfig } from 'aws-rum-web';

const MONITOR_ID = '1fc5e95f-e1e6-420d-bd88-2512b2bc0a1b';
const AWS_REGION = 'eu-central-1';
const APP_VERSION = '1.0.1';

let rumClient: AwsRum | null = null;

/** Enable privacy-limited RUM only on the canonical public production host. */
export function initUreFyRum(): void {
  if (rumClient || window.location.hostname !== 'urefy.com') return;

  const config: AwsRumConfig = {
    sessionSampleRate: 0.1,
    disableAutoPageView: true,
    endpoint: `https://dataplane.rum.${AWS_REGION}.amazonaws.com`,
    telemetries: [
      ['errors', { stackTraceLength: 256 }],
      ['performance', { ignore: (entry: PerformanceEntry) => entry.entryType === 'resource' }],
    ],
    allowCookies: false,
    enableXRay: false,
    signing: false,
    pageIdFormat: 'PATH',
    recordResourceUrl: false,
    sessionEventLimit: 50,
    batchLimit: 25,
  };

  try {
    rumClient = new AwsRum(MONITOR_ID, APP_VERSION, AWS_REGION, config);
    // Use one aggregate page ID; automatic page IDs can include profile handles.
    rumClient.recordPageView({ pageId: '/app' });
  } catch {
    // Monitoring must never interfere with opening the encrypted workspace.
    rumClient = null;
  }
}
