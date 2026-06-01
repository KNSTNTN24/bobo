import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const hash = (pw: string) => bcrypt.hashSync(pw, 10);
const slug = (s: string) =>
  "p-" + s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const KITCHEN = "Kitchen bread";
const SMOKED = "Smoked / meat / prep";
const PASTRY = "Pastry / retail bakery";

const PRODUCTS: {
  name: string;
  category: string;
  unit: string;
  priceP: number;
  allowsNote?: boolean;
}[] = [
  // Category 1: Kitchen bread
  { name: "Sourdough Bread - Kitchen", category: KITCHEN, unit: "item", priceP: 450 },
  { name: "Focaccia - Kitchen", category: KITCHEN, unit: "item", priceP: 380 },
  { name: "Burger Bun - Kitchen", category: KITCHEN, unit: "item", priceP: 120 },

  // Category 2: Smoked / meat / prep
  { name: "Smoked Lamb", category: SMOKED, unit: "kg", priceP: 2200 },
  { name: "Smoked Brisket", category: SMOKED, unit: "kg", priceP: 1900 },
  { name: "Smoked Chicken", category: SMOKED, unit: "kg", priceP: 1400 },
  { name: "Halal Bacon", category: SMOKED, unit: "kg", priceP: 1600 },
  { name: "Halal Sausage", category: SMOKED, unit: "kg", priceP: 1200 },
  { name: "Pickled Goods", category: SMOKED, unit: "kg", priceP: 900, allowsNote: true },

  // Category 3: Pastry / retail bakery
  { name: "Plain C.Buns", category: PASTRY, unit: "item", priceP: 320 },
  { name: "Raspberry White Choco", category: PASTRY, unit: "item", priceP: 360 },
  { name: "Pist. C.Buns", category: PASTRY, unit: "item", priceP: 390 },
  { name: "Apple C. Buns", category: PASTRY, unit: "item", priceP: 340 },
  { name: "ALM. CROISSANT", category: PASTRY, unit: "item", priceP: 350 },
  { name: "Pistachio Pain au Chocolate", category: PASTRY, unit: "item", priceP: 395 },
  { name: "Dark Croissants", category: PASTRY, unit: "item", priceP: 300 },
  { name: "Croissants", category: PASTRY, unit: "item", priceP: 280 },
  { name: "Pain au Chocolate", category: PASTRY, unit: "item", priceP: 310 },
  { name: "PISTA / CHOCO PAIN AU SUSSIE", category: PASTRY, unit: "item", priceP: 420 },
  { name: "THE BOW ( DULCHE)", category: PASTRY, unit: "item", priceP: 380 },
  { name: "BROWINE", category: PASTRY, unit: "item", priceP: 330 },
  { name: "Pain au Raisin", category: PASTRY, unit: "item", priceP: 320 },
  { name: "Apricot & Almond Danish", category: PASTRY, unit: "item", priceP: 360 },
  { name: "WALNUT / CHOCLATE COOKIE", category: PASTRY, unit: "item", priceP: 290 },
  { name: "Choco Cookies", category: PASTRY, unit: "item", priceP: 250 },
  { name: "HONEY CAKE", category: PASTRY, unit: "item", priceP: 450 },
  { name: "TOFFEE CAKE", category: PASTRY, unit: "item", priceP: 460 },
  { name: "SNICKER ROUND", category: PASTRY, unit: "item", priceP: 390 },
  { name: "APPLE TART", category: PASTRY, unit: "item", priceP: 410 },
  { name: "Ret. Focaccia", category: PASTRY, unit: "item", priceP: 400 },
  { name: "Ret. Sourd. Bread", category: PASTRY, unit: "item", priceP: 470 },
];

async function main() {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      currency: "GBP",
      canBakeryEditProducts: false,
      canBakeryEditPrices: false,
      weeklyConfirmLeadHours: 36,
    },
  });

  const soho = await prisma.cafe.upsert({
    where: { id: "cafe-soho" },
    update: {},
    create: {
      id: "cafe-soho",
      name: "BOBO Soho",
      address: "12 Greek St, London W1D",
      invoicePeriod: "WEEKLY",
      invoiceAnchor: 1,
    },
  });

  const shoreditch = await prisma.cafe.upsert({
    where: { id: "cafe-shoreditch" },
    update: {},
    create: {
      id: "cafe-shoreditch",
      name: "BOBO Shoreditch",
      address: "5 Rivington St, London EC2A",
      invoicePeriod: "MONTHLY",
      invoiceAnchor: 1,
    },
  });

  const users = [
    { id: "u-admin", name: "Alice Admin", login: "admin", role: "ADMIN", cafeId: null, pw: "admin123" },
    { id: "u-bakery", name: "Bruno Baker", login: "bakery", role: "BAKERY", cafeId: null, pw: "bakery123" },
    { id: "u-courier", name: "Carl Courier", login: "courier", role: "COURIER", cafeId: null, pw: "courier123" },
    { id: "u-soho", name: "Sam (Soho)", login: "soho", role: "CAFE", cafeId: soho.id, pw: "soho123" },
    { id: "u-shoreditch", name: "Sky (Shoreditch)", login: "shoreditch", role: "CAFE", cafeId: shoreditch.id, pw: "shoreditch123" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { login: u.login },
      update: {},
      create: {
        id: u.id,
        name: u.name,
        login: u.login,
        role: u.role,
        cafeId: u.cafeId,
        passwordHash: hash(u.pw),
      },
    });
  }

  for (const p of PRODUCTS) {
    const id = slug(p.name);
    await prisma.product.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name: p.name,
        category: p.category,
        unit: p.unit,
        priceP: p.priceP,
        allowsNote: p.allowsNote ?? false,
      },
    });
  }

  console.log(
    `Seeded: settings, 2 cafés, ${users.length} users, ${PRODUCTS.length} products`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
