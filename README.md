
# 🚀 Digital Delivery & Asset Security Service

An end-to-end, full-stack microservice prototype built with **Node.js**, **React**, and **Firebase** for processing post-purchase webhooks, dynamically watermarking digital eBooks, and serving expiring download links for digital products.

Designed for automated fulfillment of eBooks, stock photo bundles, and digital downloads built with Google AI Studio and deployed on **Google Cloud Run**.

---

## ✨ Features

* **⚡ Automated Purchase Webhooks:** Dedicated API route (`/api/webhook`) to handle post-checkout payloads from payment gateways (Stripe, Paddle, Dodo Payments, etc.).
* **🔒 Dynamic PDF Watermarking:** Automatically stamps the customer's email address onto PDF pages before delivery using `pdf-lib` to prevent unauthorized file sharing.
* **⏱️ Expiring Download URLs:** Securely serves high-resolution image assets and eBooks using time-limited, tokenized Cloud Storage URLs.
* **🔑 Customer Portal & Auth:** Integrated **Firebase Authentication** and **Cloud Firestore** database for buyer order history and account management.
* **📦 Cloud Native:** Provisioned for 1-click containerized deployment to **Google Cloud Run**.

---

## 🛠️ Tech Stack

* **Frontend:** React, Tailwind CSS / UI Components
* **Backend:** Node.js, Express
* **Database & Auth:** Firebase Authentication, Cloud Firestore
* **Storage & Security:** Google Cloud Storage, `pdf-lib` (PDF stamping), `sharp` (Image manipulation)
* **Deployment:** Docker, Google Cloud Run

---

## 📁 Repository Structure

```text
├── src/
│   ├── components/       # React UI components (Dashboard, Order History)
│   ├── services/         # Firebase initialization & helper functions
│   └── App.js            # Frontend entry point
├── server/
│   ├── routes/
│   │   ├── webhook.js    # Payment gateway webhook receiver
│   │   └── delivery.js   # Secure file stream & signed URL generation
│   ├── utils/
│   │   └── watermark.js  # Server-side PDF dynamic stamping engine
│   └── index.js          # Express backend entry point
├── Dockerfile            # Cloud Run build configuration
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

* **Node.js** (v18 or higher)
* **npm** or **yarn**
* A **Firebase Project** (with Firestore and Authentication enabled)
* A **Google Cloud Storage Bucket** (for hosting protected digital assets)

---

### Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   cd YOUR_REPOSITORY
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory and populate it with your Firebase and Cloud credentials:

   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Firebase Admin SDK Configuration
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-client-email@your-project-id.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

   # Google Cloud Storage
   GCS_BUCKET_NAME=your-digital-assets-bucket

   # Webhook Secret (Matches Payment Gateway)
   WEBHOOK_SECRET=your_webhook_signing_secret
   ```

4. **Run local Development Server**
   ```bash
   # Starts Express API & React Frontend concurrently
   npm run dev
   ```

---

## 🧪 Testing Webhooks Locally

You can test the purchase fulfillment flow locally using `curl` or Postman:

```bash
curl -X POST http://localhost:5000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment_intent.succeeded",
    "customer": {
      "email": "buyer@example.com",
      "name": "Jane Doe"
    },
    "product": {
      "id": "ebook-ai-guide",
      "file_path": "ebooks/ai-guide.pdf"
    }
  }'
```

---

## ☁️ Deployment

### Google Cloud Run

This repository includes a pre-configured `Dockerfile` for seamless deployment via Google Cloud Run:

```bash
# Build the container image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/digital-delivery-service

# Deploy to Cloud Run
gcloud run deploy digital-delivery-service \
  --image gcr.io/YOUR_PROJECT_ID/digital-delivery-service \
  --platform managed \
  --allow-unauthenticated
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
