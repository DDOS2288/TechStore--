const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

const email = process.argv[2];

if (!email) {
  console.error("❌ Укажите email. Пример: node make-admin.js your@email.com");
  process.exit(1);
}

async function makeAdmin() {
  try {
    const userRecord = await auth.getUserByEmail(email);
    await db.collection("users").doc(userRecord.uid).update({ role: "admin" });
    console.log(`✅ Пользователь ${email} (uid: ${userRecord.uid}) теперь admin.`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Ошибка:", err.message);
    process.exit(1);
  }
}

makeAdmin();
