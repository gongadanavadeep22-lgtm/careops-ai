/**
 * Mock firebase-admin / firestore for smoke tests (no real credentials).
 */
const Module = require('module');
const originalRequire = Module.prototype.require;

const mockFirestore = {
  collection: () => ({
    doc: () => ({
      get: async () => ({ exists: false, data: () => ({}) }),
      set: async () => {},
      update: async () => {},
    }),
    where: () => mockFirestore.collection(),
    add: async () => ({ id: 'mock-id' }),
    get: async () => ({ docs: [], empty: true }),
  }),
};

Module.prototype.require = function mockRequire(id) {
  if (id === 'firebase-admin') {
    return {
      apps: [],
      initializeApp: () => ({}),
      credential: { cert: () => ({}) },
      auth: () => ({
        verifyIdToken: async () => {
          throw new Error('invalid token');
        },
      }),
      firestore: { FieldValue: { serverTimestamp: () => new Date(), arrayUnion: (x) => x } },
      storage: () => ({ bucket: () => ({ file: () => ({ save: async () => {}, getSignedUrl: async () => ['http://x'] }) }) }),
      database: () => ({}),
    };
  }
  if (id.endsWith('services/firestore') || id === '../services/firestore') {
    return {
      admin: mockRequire.call(this, 'firebase-admin'),
      db: mockFirestore,
      rtdb: null,
    };
  }
  return originalRequire.apply(this, arguments);
};
