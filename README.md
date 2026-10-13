# Nova Trend 🛍️

### Discover More. Shop Smarter.

**Nova Trend** is a full-stack, multi-vendor e-commerce marketplace that connects customers with sellers through a unified shopping experience. The platform brings together product discovery, seller management, secure online payments, inventory tracking, order processing, promotional discounts, and administrative controls.

Built with React, TypeScript, Express.js, MongoDB, and Prisma, Nova Trend combines modern web technologies with AI integration and automated background workflows to create a scalable foundation for online commerce.

---

## ✨ Features

### 🛒 Customer Experience
- Browse and discover products across categories.
- View product details, prices, images, and availability.
- Manage shopping carts and place orders.
- Apply eligible promotional discounts.
- Manage delivery addresses and contact information.
- Track order and payment statuses.
- Access AI-assisted customer support for relevant shopping questions.
- Submit product reviews and interact with review features.

### 🏪 Seller Management
- Seller onboarding and approval workflows.
- Product creation and management.
- Inventory and stock management.
- Product publication and approval workflows.
- Seller-specific product and order management.
- Promotional campaign management.

### 🛡️ Administration
- Role-based access control for buyers, sellers, and administrators.
- Seller approval and account management.
- Product moderation and publication controls.
- Centralized oversight of marketplace operations.

### 💳 Payments and Orders
- Razorpay payment integration.
- Server-side payment signature verification.
- Signed webhook verification for payment events.
- Order creation and status management.
- Inventory reservation and stock restoration workflows.
- Idempotent handling of duplicate payment notifications.
- Support for cash on delivery where enabled.

### 🤖 AI and Automation
- Gemini integration for AI-assisted customer support.
- Background job processing with Inngest.
- Email notifications through Resend.
- Image and media uploads through UploadThing.

---

## 🧰 Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, React Router |
| Styling | Tailwind CSS |
| State Management | Zustand |
| Server State | TanStack Query |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| ORM | Prisma |
| Authentication | Better Auth |
| Payments | Razorpay |
| AI | Google Gemini |
| Media Uploads | UploadThing |
| Email | Resend |
| Background Jobs | Inngest |
| Deployment | Vercel-compatible frontend configuration |
| CI/CD | GitHub Actions |

---

## 🏗️ Architecture

Nova Trend follows a frontend-backend architecture that separates the user interface, API logic, authentication, database access, and third-party integrations.

```text
                 Nova Trend
                      |
          +-----------+-----------+
          |                       |
      Frontend                 Backend
 React + TypeScript        Node.js + Express
          |                       |
          |              +--------+--------+
          |              |        |        |
          |           Better    Prisma   Services
          |            Auth       |        |
          |                       |        |
          |                    MongoDB     |
          |                                |
          |               +----------------+----------------+
          |               |                |                |
          |            Razorpay          Gemini           Inngest
          |               |                |                |
          +---------------+----------------+----------------+
                          |
                  External Integrations
```

The frontend handles the user experience and client-side state, while the backend validates requests, enforces authorization, calculates order totals, processes payments, and coordinates database operations.

---

## 📁 Project Structure

```text
nova-trend/
├── .github/
│   └── workflows/       # CI workflows
├── backend/
│   ├── src/
│   │   ├── controllers/ # Request and business logic
│   │   ├── routes/      # API routes
│   │   ├── middleware/  # Authentication and authorization
│   │   └── lib/         # Shared services and integrations
│   ├── generated/       # Generated Prisma client
│   ├── prisma/          # Database schema, if present
│   ├── package.json
│   └── README.md
├── frontend/
│   ├── app/             # React Router application
│   ├── public/          # Public assets
│   ├── package.json
│   └── README.md
├── prompts/             # Project-related AI prompts
├── .gitignore
└── README.md
```

*The structure above is representative. Generated files and schema locations may vary according to your current repository configuration.*

---

## ⚙️ Getting Started

### Prerequisites

Install the following before running the project:

- Node.js 22.22 or newer.
- npm.
- A MongoDB database that supports transactions, such as MongoDB Atlas or a properly configured replica set.
- Razorpay test credentials for online payment testing.
- Service credentials for any optional integrations you want to enable.

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR-USERNAME/nova-trend.git
cd nova-trend
```

Replace `YOUR-USERNAME` with your GitHub username.

### 2. Configure the Backend

```bash
cd backend
npm install
```

Create a local `.env` file using the environment template or the variable names required by the backend source code.

At minimum, configure the database connection:

```env
DATABASE_URL="your-mongodb-connection-string"
```

Also configure the authentication secret, trusted origins, and the credentials required for whichever integrations you enable.

For Razorpay checkout, configure:

```env
RAZORPAY_KEY_ID="your-test-key-id"
RAZORPAY_KEY_SECRET="your-test-key-secret"
RAZORPAY_WEBHOOK_SECRET="your-test-webhook-secret"
```

Use the actual variable names expected by the application. Do not commit `.env` files or real credentials to GitHub.

Start the backend:

```bash
npm run dev
```

The backend listens on port `5000` by default, unless configured otherwise.

### 3. Configure the Frontend

Open a second terminal from the project root:

```bash
cd frontend
npm install
```

The frontend uses `http://localhost:5000` as its default development API host. If required, configure `VITE_API_URL` in the frontend environment according to the existing application configuration.

Start the frontend:

```bash
npm run dev
```

Open the local URL printed by the development server, typically:

http://localhost:5173

### 4. Build for Production

Build the frontend:

```bash
cd frontend
npm run build
```

Run its typecheck:

```bash
npm run typecheck
```

Run backend tests:

```bash
cd ../backend
npm test
```

Consult the backend package scripts and README for additional checks and integration-test requirements.

---

## 🔐 Security Considerations

Nova Trend is designed with security-sensitive commerce workflows in mind.

- Authentication and server-side authorization.
- Server-verified payment signatures.
- Webhook signature verification.
- Server-side pricing and discount calculations.
- Conditional inventory updates and transaction-based workflows.
- Protection of private customer and order data.

**Production deployment checklist:**

- Keep all secrets out of source control.
- Use HTTPS and secure cookie settings.
- Configure production trusted origins and CORS correctly.
- Enforce authorization for every protected API operation.
- Validate incoming request data.
- Use Razorpay production credentials only after testing.
- Configure and verify payment webhooks.
- Back up the database before schema changes.
- Monitor failed payments, background jobs, and application errors.

These are implementation and deployment requirements; the presence of a feature in the code does not by itself guarantee production security.

---

## 🧪 Testing and Quality Assurance

The repository includes backend tests and GitHub Actions workflows for automated checks.

Recommended validation areas include:

- Authentication and role-based permissions.
- Seller approval and product publication.
- Order totals and promotion validation.
- Payment signature verification.
- Duplicate webhook processing.
- Inventory reservation and restoration.
- Cross-user order access restrictions.
- Frontend typechecking and production builds.

Run the available checks before submitting changes or deploying the application.

---

## 🚀 Deployment

The frontend includes Vercel-compatible React Router deployment configuration.

Before deployment:

1. Configure backend environment variables.
2. Provision MongoDB with transaction support.
3. Deploy the backend and configure its public URL.
4. Configure the frontend's production API routing.
5. Set the correct authentication origins and callback URLs.
6. Configure Razorpay webhooks.
7. Verify checkout, order processing, and error handling in a test environment.

Deploy the frontend and backend according to their respective runtime and hosting requirements.

---

## 🔮 Future Improvements

Potential areas for further development include:

- Expanded product search and filtering.
- Personalized product recommendations.
- Enhanced seller analytics and sales dashboards.
- More comprehensive integration and end-to-end tests.
- Improved observability and payment reconciliation.
- Performance optimization and caching.
- Accessibility and responsive UI improvements.

---

## 👨‍💻 Author

**Shubham Kumar**

GitHub: [@shubhammishra077](https://github.com/shubhammishra077)

---

## 📄 License

Add a `LICENSE` file and specify the applicable license before distributing or accepting external contributions.

---

*Nova Trend — Discover More. Shop Smarter.*
