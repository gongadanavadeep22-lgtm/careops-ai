const { randomUUID } = require('crypto');
const { resolveStorageBucket } = require('./storageBucket');

const SIGNED_URL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function downloadUrlFromToken(bucketName, storagePath, token) {
  if (!bucketName || !storagePath || !token) return null;
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

async function signedUrlForStoragePath(storagePath) {
  if (!storagePath) return null;
  try {
    const bucket = await resolveStorageBucket();
    const [signedUrl] = await bucket.file(storagePath).getSignedUrl({
      action: 'read',
      expires: Date.now() + SIGNED_URL_TTL_MS,
    });
    return signedUrl;
  } catch {
    return null;
  }
}

async function urlForLabReport(report) {
  if (!report || typeof report !== 'object') return null;
  const storagePath = report.storagePath;
  if (!storagePath) return report.url || null;

  try {
    const bucket = await resolveStorageBucket();
    const [meta] = await bucket.file(storagePath).getMetadata();
    const rawToken = meta.metadata?.firebaseStorageDownloadTokens;
    const token = rawToken ? String(rawToken).split(',')[0].trim() : '';
    const fromToken = downloadUrlFromToken(bucket.name, storagePath, token);
    if (fromToken) return fromToken;
  } catch {
    /* fall through */
  }

  const signed = await signedUrlForStoragePath(storagePath);
  return signed || report.url || null;
}

async function withFreshLabReportUrls(labReports) {
  if (!Array.isArray(labReports) || labReports.length === 0) return [];

  return Promise.all(
    labReports.map(async (report) => {
      if (!report || typeof report !== 'object') return report;
      const url = await urlForLabReport(report);
      return url ? { ...report, url } : report;
    })
  );
}

async function saveLabReportFile(buffer, storagePath, contentType) {
  const bucket = await resolveStorageBucket();
  const fileRef = bucket.file(storagePath);
  const token = randomUUID();

  await fileRef.save(buffer, {
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  const url = downloadUrlFromToken(bucket.name, storagePath, token);
  if (!url) {
    throw new Error('Could not build download URL for uploaded lab report');
  }

  return { url, storagePath, token };
}

module.exports = {
  withFreshLabReportUrls,
  signedUrlForStoragePath,
  urlForLabReport,
  saveLabReportFile,
  downloadUrlFromToken,
  SIGNED_URL_TTL_MS,
};
