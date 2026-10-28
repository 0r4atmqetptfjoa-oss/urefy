# UREfy Self-Hosting Guide: Deploy Your Own Sovereign Node in 3 Minutes

**Official Repository:** [https://github.com/0r4atmqetptfjoa-oss/urefy](https://github.com/0r4atmqetptfjoa-oss/urefy)  
**License:** Open Source (MIT)

---

## 1. Overview

UREfy is built on a modern, ultra-lightweight **Serverless Edge Architecture**. Unlike traditional federated servers (such as Matrix Synapse or Mastodon) that require expensive Linux VPS instances running heavy PostgreSQL and Python/Ruby daemons, a complete UREfy node can run:
1. **Option A: On Cloudflare Pages & D1 (100% Free Tier, 0€/month)**
2. **Option B: Locally or on a private server via Node.js / Docker**

---

## 2. Option A: 1-Click Serverless Deploy on Cloudflare (Recommended)

Running on Cloudflare gives your node global distribution across 330+ edge locations with built-in DDoS protection, automatic SSL, and zero server maintenance.

### Prerequisites:
* A free [Cloudflare Account](https://dash.cloudflare.com/)
* Node.js v22+ and Git installed locally

### Step 1: Clone the Repository
```bash
git clone https://github.com/0r4atmqetptfjoa-oss/urefy.git
cd urefy
npm install
```

### Step 2: Create Your Free Cloudflare D1 Database & KV Namespace
```bash
# Login to Cloudflare Wrangler
npx wrangler login

# Create your D1 SQL database
npx wrangler d1 create urefy-db

# Create your KV Cache namespace
npx wrangler kv namespace create KV
```
*Copy the generated database ID and KV namespace ID into `packages/client-ui/wrangler.toml`.*

### Step 3: Apply the Database Schema
```bash
# Initialize all 48 database tables
npx wrangler d1 execute urefy-db --file=packages/client-ui/migrations/0001_initial_schema.sql
```

### Step 4: Build and Deploy to Cloudflare Pages
```bash
# Compile client UI and edge functions
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy packages/client-ui/dist --project-name my-urefy-node
```
*Your independent UREfy node is now live with its own custom URL and custom domain!*

---

## 3. Option B: Local / Private Node Development

To run and test UREfy completely offline on your local machine:

```bash
# 1. Start the development server
npm run dev

# 2. Open in your browser
# Visit http://localhost:5173
```

All cryptographic keys, local feeds, and IndexedDB vaults will execute entirely in your local browser sandbox without sending any external requests.

---

## 4. Environment Variables Reference

| Variable | Description | Example |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Deployment environment | `production` / `development` |
| `APP_NAME` | Name displayed on your node | `UREfy Sovereign` |
| `ADMIN_PIN` | Secure PIN for Mission Control `/control` | `YourSecretPin123!` |
| `MAX_STORAGE_CAP_BYTES` | Maximum storage allocated for your node | `8589934592` (8 GB) |

---

## 5. Security Verification

After deploying your node, verify that all 23 production security gates pass cleanly:

```bash
npm run audit:production
```

If you encounter any issues or want to contribute to the protocol, open an issue or pull request on [GitHub](https://github.com/0r4atmqetptfjoa-oss/urefy).
