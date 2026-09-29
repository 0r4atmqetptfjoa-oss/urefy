import { test, expect } from '@playwright/test';

test('two real browser peers exchange bytes over an RTCDataChannel', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit headless in Playwright lacks WebRTC RTCPeerConnection support');
  const result = await page.evaluate(async () => {
    const sender = new RTCPeerConnection({ iceServers: [] });
    const receiver = new RTCPeerConnection({ iceServers: [] });
    const channel = sender.createDataChannel('urefy-live-check', { ordered: true });
    const payload = crypto.getRandomValues(new Uint8Array(64 * 1024));

    sender.onicecandidate = ({ candidate }) => candidate && receiver.addIceCandidate(candidate);
    receiver.onicecandidate = ({ candidate }) => candidate && sender.addIceCandidate(candidate);

    const received = new Promise<Uint8Array>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('RTC data channel timed out')), 10_000);
      receiver.ondatachannel = ({ channel: inbound }) => {
        inbound.binaryType = 'arraybuffer';
        inbound.onmessage = ({ data }) => {
          clearTimeout(timeout);
          resolve(new Uint8Array(data));
        };
      };
    });

    const opened = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('RTC data channel did not open')), 10_000);
      channel.onopen = () => { clearTimeout(timeout); resolve(); };
    });

    await sender.setLocalDescription(await sender.createOffer());
    await receiver.setRemoteDescription(sender.localDescription!);
    await receiver.setLocalDescription(await receiver.createAnswer());
    await sender.setRemoteDescription(receiver.localDescription!);
    await opened;
    channel.send(payload);
    const actual = await received;

    const matches = actual.length === payload.length && actual.every((byte, index) => byte === payload[index]);
    sender.close();
    receiver.close();
    return { matches, byteLength: actual.length };
  });

  expect(result).toEqual({ matches: true, byteLength: 64 * 1024 });
});
