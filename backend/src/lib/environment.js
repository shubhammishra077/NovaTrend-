const REQUIRED_ENVIRONMENT_VARIABLES = [
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "FRONTEND_URL",
];

function validatePublicUrl(name, value, nodeEnv) {
    let url;
    try {
        url = new URL(value);
    }
    catch {
        throw new Error(`${name} must be a valid absolute URL.`);
    }
    if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error(`${name} must use HTTP or HTTPS.`);
    }
    if (nodeEnv === "production" && (url.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(url.hostname))) {
        throw new Error(`${name} must use a public HTTPS URL in production.`);
    }
    if (name === "FRONTEND_URL" && (url.pathname !== "/" || url.search || url.hash)) {
        throw new Error("FRONTEND_URL must be an origin without a path, query, or fragment.");
    }
}

export function validateEnvironment(environment = process.env) {
    const missing = REQUIRED_ENVIRONMENT_VARIABLES.filter((name) => !environment[name]?.trim());
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
    if (environment.BETTER_AUTH_SECRET.length < 32) {
        throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
    }

    validatePublicUrl("BETTER_AUTH_URL", environment.BETTER_AUTH_URL, environment.NODE_ENV);
    validatePublicUrl("FRONTEND_URL", environment.FRONTEND_URL, environment.NODE_ENV);

    const googleCredentials = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
    if (googleCredentials.some((name) => Boolean(environment[name])) &&
        !googleCredentials.every((name) => Boolean(environment[name]))) {
        throw new Error("Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google sign-in.");
    }

    const razorpayKeys = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"];
    if (razorpayKeys.some((name) => Boolean(environment[name])) &&
        !razorpayKeys.every((name) => Boolean(environment[name]))) {
        throw new Error(`Set both ${razorpayKeys.join(" and ")} to enable Razorpay checkout.`);
    }
    if (razorpayKeys.every((name) => Boolean(environment[name])) && !environment.RAZORPAY_WEBHOOK_SECRET) {
        throw new Error("Set RAZORPAY_WEBHOOK_SECRET when Razorpay checkout is enabled.");
    }
}
