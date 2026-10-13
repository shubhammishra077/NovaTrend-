import "dotenv/config";
import { validateEnvironment } from "./environment.js";
import { PrismaClient } from "../../generated/prisma/client.js";
validateEnvironment();
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
export { prisma };
