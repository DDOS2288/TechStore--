// seed.js
// Скрипт наполняет Firestore тестовыми категориями и товарами для TechStore.
// Использует Firebase Admin SDK — работает в обход Security Rules,
// поэтому подходит для одноразового наполнения базы данными.

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ---------- КАТЕГОРИИ ----------
const categories = [
  { id: "smartphones", name: "Смартфоны", slug: "smartphones" },
  { id: "laptops", name: "Ноутбуки", slug: "laptops" },
  { id: "headphones", name: "Наушники", slug: "headphones" },
  { id: "tablets", name: "Планшеты", slug: "tablets" },
];

// ---------- ТОВАРЫ ----------
// specs у каждой категории свои — это пригодится для страницы сравнения
const products = [
  // Смартфоны
  {
    name: "iPhone 15",
    description: "Смартфон Apple с чипом A16 Bionic и камерой 48 Мп",
    categoryId: "smartphones",
    categoryName: "Смартфоны",
    price: 450000,
    images: ["https://placehold.co/400x400?text=iPhone+15"],
    specs: { "Экран": "6.1\"", "Память": "128 ГБ", "Батарея": "3349 мАч", "Камера": "48 Мп" },
    rating: 4.7,
    reviewsCount: 0,
    inStock: true,
  },
  {
    name: "Samsung Galaxy S24",
    description: "Флагман Samsung с динамическим AMOLED дисплеем",
    categoryId: "smartphones",
    categoryName: "Смартфоны",
    price: 420000,
    images: ["https://placehold.co/400x400?text=Galaxy+S24"],
    specs: { "Экран": "6.2\"", "Память": "256 ГБ", "Батарея": "4000 мАч", "Камера": "50 Мп" },
    rating: 4.5,
    reviewsCount: 0,
    inStock: true,
  },
  {
    name: "Xiaomi 14",
    description: "Мощный смартфон с камерой Leica",
    categoryId: "smartphones",
    categoryName: "Смартфоны",
    price: 310000,
    images: ["https://placehold.co/400x400?text=Xiaomi+14"],
    specs: { "Экран": "6.36\"", "Память": "256 ГБ", "Батарея": "4610 мАч", "Камера": "50 Мп" },
    rating: 4.4,
    reviewsCount: 0,
    inStock: true,
  },
  {
    name: "Google Pixel 8",
    description: "Чистый Android и лучшая на рынке компьютерная фотография",
    categoryId: "smartphones",
    categoryName: "Смартфоны",
    price: 350000,
    images: ["https://placehold.co/400x400?text=Pixel+8"],
    specs: { "Экран": "6.2\"", "Память": "128 ГБ", "Батарея": "4575 мАч", "Камера": "50 Мп" },
    rating: 4.6,
    reviewsCount: 0,
    inStock: false,
  },

  // Ноутбуки
  {
    name: "MacBook Air M2",
    description: "Лёгкий и производительный ноутбук Apple",
    categoryId: "laptops",
    categoryName: "Ноутбуки",
    price: 650000,
    images: ["https://placehold.co/400x400?text=MacBook+Air+M2"],
    specs: { "Процессор": "Apple M2", "ОЗУ": "8 ГБ", "SSD": "256 ГБ", "Экран": "13.6\"" },
    rating: 4.8,
    reviewsCount: 0,
    inStock: true,
  },
  {
    name: "ASUS ROG Zephyrus",
    description: "Игровой ноутбук с RTX 4070",
    categoryId: "laptops",
    categoryName: "Ноутбуки",
    price: 900000,
    images: ["https://placehold.co/400x400?text=ROG+Zephyrus"],
    specs: { "Процессор": "Ryzen 9", "ОЗУ": "32 ГБ", "SSD": "1 ТБ", "Видеокарта": "RTX 4070" },
    rating: 4.7,
    reviewsCount: 0,
    inStock: true,
  },
  {
    name: "Lenovo ThinkPad X1",
    description: "Бизнес-ноутбук с прочным корпусом",
    categoryId: "laptops",
    categoryName: "Ноутбуки",
    price: 700000,
    images: ["https://placehold.co/400x400?text=ThinkPad+X1"],
    specs: { "Процессор": "Intel i7", "ОЗУ": "16 ГБ", "SSD": "512 ГБ", "Экран": "14\"" },
    rating: 4.6,
    reviewsCount: 0,
    inStock: true,
  },
  {
    name: "HP Pavilion 15",
    description: "Универсальный ноутбук на каждый день",
    categoryId: "laptops",
    categoryName: "Ноутбуки",
    price: 380000,
    images: ["https://placehold.co/400x400?text=HP+Pavilion+15"],
    specs: { "Процессор": "Intel i5", "ОЗУ": "8 ГБ", "SSD": "512 ГБ", "Экран": "15.6\"" },
    rating: 4.2,
    reviewsCount: 0,
    inStock: true,
  },

  // Наушники
  {
    name: "AirPods Pro 2",
    description: "Беспроводные наушники с активным шумоподавлением",
    categoryId: "headphones",
    categoryName: "Наушники",
    price: 130000,
    images: ["https://placehold.co/400x400?text=AirPods+Pro+2"],
    specs: { "Тип": "TWS", "Шумоподавление": "Да", "Время работы": "6 ч" },
    rating: 4.7,
    reviewsCount: 0,
    inStock: true,
  },
  {
    name: "Sony WH-1000XM5",
    description: "Топовые накладные наушники с лучшим ANC на рынке",
    categoryId: "headphones",
    categoryName: "Наушники",
    price: 170000,
    images: ["https://placehold.co/400x400?text=Sony+WH-1000XM5"],
    specs: { "Тип": "Накладные", "Шумоподавление": "Да", "Время работы": "30 ч" },
    rating: 4.9,
    reviewsCount: 0,
    inStock: true,
  },
  {
    name: "JBL Tune 510BT",
    description: "Бюджетные накладные наушники с хорошим басом",
    categoryId: "headphones",
    categoryName: "Наушники",
    price: 25000,
    images: ["https://placehold.co/400x400?text=JBL+Tune+510BT"],
    specs: { "Тип": "Накладные", "Шумоподавление": "Нет", "Время работы": "40 ч" },
    rating: 4.1,
    reviewsCount: 0,
    inStock: true,
  },

  // Планшеты
  {
    name: "iPad Air",
    description: "Планшет Apple с чипом M1",
    categoryId: "tablets",
    categoryName: "Планшеты",
    price: 380000,
    images: ["https://placehold.co/400x400?text=iPad+Air"],
    specs: { "Экран": "10.9\"", "Память": "64 ГБ", "Процессор": "Apple M1" },
    rating: 4.6,
    reviewsCount: 0,
    inStock: true,
  },
  {
    name: "Samsung Galaxy Tab S9",
    description: "Флагманский Android-планшет с AMOLED-экраном",
    categoryId: "tablets",
    categoryName: "Планшеты",
    price: 420000,
    images: ["https://placehold.co/400x400?text=Galaxy+Tab+S9"],
    specs: { "Экран": "11\"", "Память": "128 ГБ", "Процессор": "Snapdragon 8 Gen 2" },
    rating: 4.5,
    reviewsCount: 0,
    inStock: true,
  },
];

async function seed() {
  console.log("Начинаю наполнение базы...");

  // 1. Категории
  const catBatch = db.batch();
  categories.forEach((cat) => {
    const ref = db.collection("categories").doc(cat.id);
    catBatch.set(ref, { name: cat.name, slug: cat.slug });
  });
  await catBatch.commit();
  console.log(`✅ Добавлено категорий: ${categories.length}`);

  // 2. Товары (пишем по одному, чтобы получить сгенерированные ID и создать keywords для поиска)
  let count = 0;
  for (const product of products) {
    const keywords = product.name
      .toLowerCase()
      .split(" ")
      .filter(Boolean);

    await db.collection("products").add({
      ...product,
      keywords, // пригодится для простого поиска по Firestore (array-contains)
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    count++;
  }
  console.log(`✅ Добавлено товаров: ${count}`);

  console.log("🎉 Готово! База наполнена тестовыми данными.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Ошибка при наполнении базы:", err);
  process.exit(1);
});
