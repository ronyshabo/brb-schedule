# brb-schedule

Shift scheduling app for BRB Coffee baristas.
Baristas log in, drag shift blocks onto a monthly calendar, and confirm their picks.

---

## Features

- Monthly calendar view (Mon–Sun grid)
- Drag-and-drop shift assignment: **Opening** 🌅, **Closing** 🌙, **Shared** ☀️
- Pending picks shown with dashed outline — nothing is saved until **Confirm**
- Multiple baristas can hold the same shift type on the same day
- Barista list auto-populated from the `baristas` Firestore collection
- One-click ↻ refresh to pull new baristas added via brb-baristas admin app

---

## Sign-up flow

1. A manager first adds the barista's **name** in the brb-baristas admin app  
   (Staff tab → Manage Baristas → Add Barista)
2. The barista opens brb-schedule → "Set up your account"
3. They select their name from the dropdown, enter an email + password
4. Their Firebase Auth account is **linked** to the barista record and a
   `scheduleUsers/{uid}` gate document is created

---

## Firestore Rules

The rules live in `firestore.rules`.  
⚠️ Because Firebase uses **one** `firestore.rules` file per project, merge the
contents of this file with the rules from the other BRB apps before deploying:

```bash
# Example: deploy only these rules (will overwrite project rules)
firebase deploy --only firestore:rules
```

Collections managed by this app:

| Collection      | Access                                              |
|-----------------|-----------------------------------------------------|
| `baristas`      | Read: any auth user. Update: first-time UID link only |
| `scheduleUsers` | Read: any auth user. Write: owner only              |
| `schedules`     | Read: registered baristas. Write: owner only        |

---

## Local Development

```bash
cd brb-schedule
npm install
cp .env.local.example .env.local   # fill in your Firebase values
npm run dev
# → http://localhost:5176
```

### `.env.local.example`

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

## Docker Build & Run (local test)

```bash
docker build \
  --build-arg VITE_FIREBASE_API_KEY=xxx \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=xxx \
  --build-arg VITE_FIREBASE_PROJECT_ID=xxx \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET=xxx \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID=xxx \
  --build-arg VITE_FIREBASE_APP_ID=xxx \
  -t brb-schedule .

docker run -p 3005:80 brb-schedule
# → http://localhost:3005
```

---

## AWS EC2 Deployment

The app runs on port **3005** inside the EC2 instance, reverse-proxied by
Caddy (or nginx) on port 443 as `schedule.brbcoffee-atx.com`.

### 1 — SSH into the instance

```bash
ssh -i brb-key.pem ubuntu@18.191.96.186
```

### 2 — Clone / pull the repo

```bash
git clone https://github.com/YOUR_ORG/brb-schedule.git   # first time
# or
cd brb-schedule && git pull                                # subsequent updates
```

### 3 — Create the env file

```bash
cat > .env.production << 'EOF'
VITE_FIREBASE_API_KEY=YOUR_VALUE
VITE_FIREBASE_AUTH_DOMAIN=YOUR_VALUE
VITE_FIREBASE_PROJECT_ID=YOUR_VALUE
VITE_FIREBASE_STORAGE_BUCKET=YOUR_VALUE
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_VALUE
VITE_FIREBASE_APP_ID=YOUR_VALUE
EOF
```

### 4 — Build & run with Docker

```bash
source .env.production

docker build \
  --build-arg VITE_FIREBASE_API_KEY="$VITE_FIREBASE_API_KEY" \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN="$VITE_FIREBASE_AUTH_DOMAIN" \
  --build-arg VITE_FIREBASE_PROJECT_ID="$VITE_FIREBASE_PROJECT_ID" \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET="$VITE_FIREBASE_STORAGE_BUCKET" \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID="$VITE_FIREBASE_MESSAGING_SENDER_ID" \
  --build-arg VITE_FIREBASE_APP_ID="$VITE_FIREBASE_APP_ID" \
  -t brb-schedule .

docker stop brb-schedule 2>/dev/null || true
docker rm   brb-schedule 2>/dev/null || true

docker run -d \
  --name brb-schedule \
  --restart unless-stopped \
  -p 3004:80 \
  brb-schedule
```

### 5 — Add HTTPS (optional)

Mount Let's Encrypt certs and enable HTTPS:

```bash
docker run -d \
  --name brb-schedule \
  --restart unless-stopped \
  -p 3005:443 -p 3005:80 \
  -e ENABLE_HTTPS=true \
  -v /etc/letsencrypt/live/schedule.brbcoffee-atx.com/fullchain.pem:/etc/nginx/certs/fullchain.pem:ro \
  -v /etc/letsencrypt/live/schedule.brbcoffee-atx.com/privkey.pem:/etc/nginx/certs/privkey.pem:ro \
  brb-schedule
```

### 6 — Caddy / reverse-proxy entry

Add to your Caddyfile (or equivalent):

```caddyfile
schedule.brbcoffee-atx.com {
    reverse_proxy localhost:3005
}
```

Then reload: `sudo systemctl reload caddy`

---

## Port Reference (all BRB apps)

| App              | EC2 Port | Dev Port |
|------------------|----------|----------|
| brb-website      | 3000     | 5175     |
| brb-baristas     | 3001     | 5173     |
| brb-events       | 3002     | 5174     |
| brb-subscriptions| 3003     | 5173*    |
| **brb-schedule** | **3005** | **5176** |
