const admin = require("firebase-admin");
const logger = require("../utils/logger");

let db = null;
let auth = null;
let messaging = null;

/**
 * Initialize Firebase Admin SDK
 * This function sets up the Firebase Admin SDK with service account credentials
 */
const initializeFirebase = () => {
  try {
    // Validate required environment variables
    const requiredEnvVars = [
      "FIREBASE_PROJECT_ID",
      "FIREBASE_CLIENT_EMAIL",
      "FIREBASE_PRIVATE_KEY",
    ];

    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
    }

    // Parse private key (handle escaped newlines)
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

    // Initialize Firebase Admin SDK
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: privateKey,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    // Initialize services
    db = admin.firestore();
    auth = admin.auth();
    messaging = admin.messaging();

    // Configure Firestore settings
    db.settings({
      timestampsInSnapshots: true,
      ignoreUndefinedProperties: true,
    });

    logger.info("✅ Firebase Admin SDK initialized successfully");
    logger.info(`🔥 Connected to project: ${process.env.FIREBASE_PROJECT_ID}`);
  } catch (error) {
    logger.error("❌ Failed to initialize Firebase Admin SDK:", error);
    throw error;
  }
};

/**
 * Get Firestore database instance
 */
const getDb = () => {
  if (!db) {
    throw new Error("Database not initialized. Call initializeFirebase() first.");
  }
  return db;
};

/**
 * Get Firebase Auth instance
 */
const getAuth = () => {
  if (!auth) {
    throw new Error("Auth not initialized. Call initializeFirebase() first.");
  }
  return auth;
};

/**
 * Get Firebase Messaging instance
 */
const getMessaging = () => {
  if (!messaging) {
    throw new Error("Messaging not initialized. Call initializeFirebase() first.");
  }
  return messaging;
};

/**
 * Database utility functions
 */
const dbUtils = {
  /**
     * Create a document with auto-generated ID
     */
  async createDocument(collection, data) {
    const docRef = await getDb().collection(collection).add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return docRef.id;
  },

  /**
     * Create or update a document with specific ID
     */
  async setDocument(collection, docId, data, merge = true) {
    await getDb().collection(collection).doc(docId).set({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge});
    return docId;
  },

  /**
     * Get a document by ID
     */
  async getDocument(collection, docId) {
    const doc = await getDb().collection(collection).doc(docId).get();
    if (!doc.exists) {
      return null;
    }
    return {id: doc.id, ...doc.data()};
  },

  /**
     * Query documents with filters
     */
  async queryDocuments(collection, filters = [], orderBy = null, limit = null) {
    let query = getDb().collection(collection);

    // Apply filters
    filters.forEach((filter) => {
      query = query.where(filter.field, filter.operator, filter.value);
    });

    // Apply ordering
    if (orderBy) {
      query = query.orderBy(orderBy.field, orderBy.direction || "asc");
    }

    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
  },

  /**
     * Update a document
     */
  async updateDocument(collection, docId, data) {
    await getDb().collection(collection).doc(docId).update({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return docId;
  },

  /**
     * Delete a document
     */
  async deleteDocument(collection, docId) {
    await getDb().collection(collection).doc(docId).delete();
    return docId;
  },

  /**
     * Batch operations
     */
  getBatch() {
    return getDb().batch();
  },

  /**
     * Transaction operations
     */
  async runTransaction(updateFunction) {
    return await getDb().runTransaction(updateFunction);
  },
};

module.exports = {
  initializeFirebase,
  getDb,
  getAuth,
  getMessaging,
  dbUtils,
  admin,
};
