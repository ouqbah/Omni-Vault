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
