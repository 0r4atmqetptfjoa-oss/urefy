# UREfy operator email

Status checked 2026-09-30.

## Receiving is active

Cloudflare Email Routing routes `contact@urefy.com`, `legal@urefy.com`, `razvan@urefy.com` and `ana.maria@urefy.com` to the owner's already verified Gmail destination. This pass added and verified Active status for `notifications@urefy.com` to the same destination, `razvan.ureche88@gmail.com`. Catch-all remains disabled. MX remains Cloudflare; DNS authority and hosting are unchanged.

Proof: `outputs/email/notifications-routing-active.png`. This verifies configuration, not a newly sent inbound test. Prior Cloudflare analytics showed 20 messages received/forwarded in the last seven days.

## Gmail sending is active

On 2026-09-30, Gmail confirmed SMTP authentication and the alias `razvan@urefy.com` in the owner account `razvan.ureche88@gmail.com`. The confirmation email was actually received through the existing Cloudflare razvan routing and its confirmation completed. Gmail displays the alias with server `email-smtp.eu-central-1.amazonaws.com`, port 587, TLS, display name Ureche Razvan. The personal Gmail address remains the default sender. In Compose, choose `razvan@urefy.com` from the From selector. No outgoing manual message was sent during this configuration pass.

Dedicated IAM identity `urefy-gmail-smtp` has console access disabled and one customer inline policy `UREfyGmailSmtpRazvanOnly`. The saved JSON was verified: source `infrastructure/aws/gmail-smtp-policy.json` permits only `ses:SendRawEmail` for the Frankfurt identity `urefy.com`, with `ses:FromAddress` equal to `razvan@urefy.com`. No infrastructure administration or other AWS service access is granted.

One access key was created with description `UREfy Gmail SMTP Frankfurt razvan-only`. The owner explicitly approved its creation and storage in Gmail. Its secret was retrieved without printing, used in memory to derive the Frankfurt SES SMTP password using AWS's documented algorithm, and discarded. Only the dedicated SMTP username and derived password were entered in Gmail; no credential was written to this documentation or the project. Clipboard was cleared. The existing infrastructure credential and user E2EE keys were untouched.

Proof: `outputs/email/gmail-alias-confirmed.png`. Gmail visibly confirmed that the user can send as razvan@urefy.com and its Accounts settings show the configured SMTP/TLS alias. This verifies setup and authentication, not delivery of a newly composed outgoing message. notifications@urefy.com receiving has Active configuration proof; the razvan route additionally delivered the Google confirmation during this pass.

Maintenance: manage this dedicated credential in IAM user urefy-gmail-smtp and Gmail Settings > Accounts and Import > Send mail as > edit info. If rotating, replace only this SMTP credential in Gmail. Other receiving aliases do not automatically become sending aliases. Do not reuse the runtime AWS credential or attach wildcard SES permissions.

No new paid mailbox subscription, dedicated IP, Mail Manager, KMS key or Secrets Manager secret was enabled. Existing SES usage pricing applies to messages and data; creating this IAM identity does not itself enable a paid mailbox service.

References: [Gmail Send mail as](https://support.google.com/mail/answer/22370), [SES SMTP credentials](https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html), [SES identity/FromAddress restrictions](https://docs.aws.amazon.com/ses/latest/dg/control-user-access.html).
