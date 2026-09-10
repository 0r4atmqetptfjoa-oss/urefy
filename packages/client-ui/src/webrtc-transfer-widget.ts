/** Keeps the optional WebRTC transfer widget out of the startup bundle. */
export async function patchWebRtcTransferWidget(containerId = 'main-layout'): Promise<void> {
  const { webrtcTransfer } = await import('./webrtc-transfer.js');
  const widgetHtml = webrtcTransfer.renderFloatingWidget();
  const existingWidget = document.getElementById('webrtc-floating-transfer-widget')
    || document.getElementById('webrtc-transfer-indicator');

  if (!widgetHtml) {
    existingWidget?.remove();
    return;
  }

  const staging = document.createElement('div');
  staging.innerHTML = widgetHtml.trim();
  const nextWidget = staging.firstElementChild;
  if (!nextWidget) return;

  if (!existingWidget) {
    document.getElementById(containerId)?.appendChild(nextWidget);
  } else if (existingWidget.outerHTML !== nextWidget.outerHTML) {
    existingWidget.replaceWith(nextWidget);
  }
}
