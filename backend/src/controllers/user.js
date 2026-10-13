import { prisma } from "../lib/prisma.js";
export async function getProfile(req, res) {
    try {
        const session = req.session;
        const userId = session.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                addresses: {
                    orderBy: { isDefault: "desc" },
                },
                phones: {
                    orderBy: { isDefault: "desc" },
                },
            },
        });
        if (!user)
            return res.status(404).json({ error: "User not found" });
        const defaultAddress = user.addresses.find((a) => a.isDefault) || user.addresses[0] || null;
        const defaultPhone = user.phones.find((p) => p.isDefault) || user.phones[0] || null;
        return res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
            banned: user.banned,
            defaultAddress,
            defaultPhone,
            addresses: user.addresses,
            phones: user.phones,
        });
    }
    catch (error) {
        console.error("Get user profile error", error);
        return res.status(500).json({ error: "Failed to fetch user profile" });
    }
}
export async function updateProfile(req, res) {
    try {
        const session = req.session;
        const userId = session.user.id;
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ error: "Phone number is required" });
        }
        if (phone.trim().length < 7) {
            return res.status(400).json({ error: "Phone number must be at least 7 characters" });
        }
        // Update or create default phone
        let defaultPhone = await prisma.phone.findFirst({
            where: { userId, isDefault: true },
        });
        if (defaultPhone) {
            await prisma.phone.update({
                where: { id: defaultPhone.id },
                data: { number: phone, updatedAt: new Date() },
            });
        }
        else {
            await prisma.phone.create({
                data: {
                    userId,
                    label: "Mobile",
                    number: phone,
                    isDefault: true,
                },
            });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                addresses: {
                    orderBy: { isDefault: "desc" },
                },
                phones: {
                    orderBy: { isDefault: "desc" },
                },
            },
        });
        const defaultAddress = user?.addresses.find((a) => a.isDefault) || user?.addresses[0] || null;
        const defaultPhoneResult = user?.phones.find((p) => p.isDefault) || user?.phones[0] || null;
        return res.json({
            id: user?.id,
            name: user?.name,
            email: user?.email,
            image: user?.image,
            role: user?.role,
            banned: user?.banned,
            defaultAddress,
            defaultPhone: defaultPhoneResult,
            addresses: user?.addresses ?? [],
            phones: user?.phones ?? [],
        });
    }
    catch (error) {
        console.error("Update user profile error", error);
        return res.status(500).json({ error: "Failed to update user profile" });
    }
}
export async function getUserReviews(req, res) {
    try {
        const session = req.session;
        const userId = session.user.id;
        const reviews = await prisma.review.findMany({
            where: { userId },
            include: {
                user: { select: { id: true, name: true, image: true } },
                product: { select: { id: true, name: true, images: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json({ reviews });
    }
    catch (error) {
        console.error("Get user reviews error", error);
        return res.status(500).json({ error: "Failed to fetch user reviews" });
    }
}
// Address CRUD
export async function listAddresses(req, res) {
    try {
        const session = req.session;
        const userId = session.user.id;
        const addresses = await prisma.address.findMany({
            where: { userId },
            orderBy: { isDefault: "desc" },
        });
        return res.json({ addresses });
    }
    catch (error) {
        console.error("List addresses error", error);
        return res.status(500).json({ error: "Failed to fetch addresses" });
    }
}
export async function createAddress(req, res) {
    try {
        const session = req.session;
        const userId = session.user.id;
        const { label, street, city, zip, country, isDefault } = req.body;
        if (!label || !street || !city || !zip || !country) {
            return res.status(400).json({ error: "All fields are required" });
        }
        // If setting as default, unset other defaults
        if (isDefault) {
            await prisma.address.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false },
            });
        }
        const address = await prisma.address.create({
            data: {
                userId,
                label,
                street,
                city,
                zip,
                country,
                isDefault: isDefault ?? false,
            },
        });
        return res.status(201).json({ address });
    }
    catch (error) {
        console.error("Create address error", error);
        return res.status(500).json({ error: "Failed to create address" });
    }
}
export async function updateAddress(req, res) {
    try {
        const session = req.session;
        const userId = session.user.id;
        const id = req.params.id;
        const { label, street, city, zip, country, isDefault } = req.body;
        // Verify ownership
        const existing = await prisma.address.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Address not found" });
        }
        // If setting as default, unset other defaults
        if (isDefault) {
            await prisma.address.updateMany({
                where: { userId, isDefault: true, id: { not: id } },
                data: { isDefault: false },
            });
        }
        const address = await prisma.address.update({
            where: { id },
            data: {
                label,
                street,
                city,
                zip,
                country,
                isDefault,
            },
        });
        return res.json({ address });
    }
    catch (error) {
        console.error("Update address error", error);
        return res.status(500).json({ error: "Failed to update address" });
    }
}
export async function deleteAddress(req, res) {
    try {
        const session = req.session;
        const userId = session.user.id;
        const id = req.params.id;
        const existing = await prisma.address.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Address not found" });
        }
        await prisma.address.delete({ where: { id } });
        return res.json({ success: true });
    }
    catch (error) {
        console.error("Delete address error", error);
        return res.status(500).json({ error: "Failed to delete address" });
    }
}
export async function setDefaultAddress(req, res) {
    try {
        const session = req.session;
        const userId = session.user.id;
        const id = req.params.id;
        const existing = await prisma.address.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Address not found" });
        }
        await prisma.$transaction([
            prisma.address.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false },
            }),
            prisma.address.update({
                where: { id },
                data: { isDefault: true },
            }),
        ]);
        return res.json({ success: true });
    }
    catch (error) {
        console.error("Set default address error", error);
        return res.status(500).json({ error: "Failed to set default address" });
    }
}
// Phone CRUD
export async function listPhones(req, res) {
    try {
        const session = req.session;
        const userId = session.user.id;
        const phones = await prisma.phone.findMany({
            where: { userId },
            orderBy: { isDefault: "desc" },
        });
        return res.json({ phones });
    }
    catch (error) {
        console.error("List phones error", error);
        return res.status(500).json({ error: "Failed to fetch phones" });
    }
}
export async function createPhone(req, res) {
    try {
        const session = req.session;
        const userId = session.user.id;
        const { label, number, isDefault } = req.body;
        if (!label || !number) {
            return res.status(400).json({ error: "Label and number are required" });
        }
        if (number.trim().length < 7) {
            return res.status(400).json({ error: "Phone number must be at least 7 characters" });
        }
        if (isDefault) {
            await prisma.phone.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false },
            });
        }
        const phone = await prisma.phone.create({
            data: {
                userId,
                label,
                number,
                isDefault: isDefault ?? false,
            },
        });
        return res.status(201).json({ phone });
    }
    catch (error) {
        console.error("Create phone error", error);
        return res.status(500).json({ error: "Failed to create phone" });
    }
}
export async function updatePhone(req, res) {
    try {
        const session = req.session;
        const userId = session.user.id;
        const id = req.params.id;
        const { label, number, isDefault } = req.body;
        const existing = await prisma.phone.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Phone not found" });
        }
        if (number && number.trim().length < 7) {
            return res.status(400).json({ error: "Phone number must be at least 7 characters" });
        }
        if (isDefault) {
            await prisma.phone.updateMany({
                where: { userId, isDefault: true, id: { not: id } },
                data: { isDefault: false },
            });
        }
        const phone = await prisma.phone.update({
            where: { id },
            data: {
                label,
                number,
                isDefault,
            },
        });
        return res.json({ phone });
    }
    catch (error) {
        console.error("Update phone error", error);
        return res.status(500).json({ error: "Failed to update phone" });
    }
}
export async function deletePhone(req, res) {
    try {
        const session = req.session;
        const userId = session.user.id;
        const id = req.params.id;
        const existing = await prisma.phone.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Phone not found" });
        }
        await prisma.phone.delete({ where: { id } });
        return res.json({ success: true });
    }
    catch (error) {
        console.error("Delete phone error", error);
        return res.status(500).json({ error: "Failed to delete phone" });
    }
}
export async function setDefaultPhone(req, res) {
    try {
        const session = req.session;
        const userId = session.user.id;
        const id = req.params.id;
        const existing = await prisma.phone.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Phone not found" });
        }
        await prisma.$transaction([
            prisma.phone.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false },
            }),
            prisma.phone.update({
                where: { id },
                data: { isDefault: true },
            }),
        ]);
        return res.json({ success: true });
    }
    catch (error) {
        console.error("Set default phone error", error);
        return res.status(500).json({ error: "Failed to set default phone" });
    }
}
