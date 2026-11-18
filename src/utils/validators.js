export const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export function isValidDriveLink(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    const allowedHosts = ['drive.google.com', 'docs.google.com'];
    return parsed.protocol === 'https:' && allowedHosts.includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function isWithin48Hours(createdAtIso, nowMs = Date.now()) {
  if (!createdAtIso) return true;
  const createdMs = new Date(createdAtIso).getTime();
  if (Number.isNaN(createdMs)) return true;
  return nowMs - createdMs <= FORTY_EIGHT_HOURS_MS;
}

export function getRemainingHours(createdAtIso, nowMs = Date.now()) {
  const createdMs = new Date(createdAtIso).getTime();
  const remainingMs = FORTY_EIGHT_HOURS_MS - (nowMs - createdMs);
  return Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)));
}

export function validateReferralInput(data) {
  const errors = {};
  if (!data.fullName?.trim()) errors.fullName = 'Candidate name is required.';
  if (!data.company?.trim()) errors.company = 'Target company is required.';
  if (!data.jobId?.trim()) errors.jobId = 'Job ID is required.';
  if (!data.role?.trim()) errors.role = 'Role title is required.';
  if (!data.differentiator?.trim()) {
    errors.differentiator =
      'Add what sets you apart (e.g., Institution, Work Exp, Patent, Research, Hackathon).';
  }
  if (!data.message?.trim() || data.message.trim().length < 20) {
    errors.message = 'Add a short suitability note (at least 20 characters).';
  }
  if (!isValidDriveLink(data.resumeUrl)) {
    errors.resumeUrl = 'Provide a valid https://drive.google.com or docs.google.com resume link.';
  }
  if (data.coverLetterUrl?.trim() && !isValidDriveLink(data.coverLetterUrl)) {
    errors.coverLetterUrl = 'Cover letter must be a valid Google Drive/Docs HTTPS link.';
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateCommentInput(commentText) {
  if (!commentText || !commentText.trim()) {
    return { isValid: false, error: 'Comment cannot be empty.' };
  }
  if (commentText.trim().length > 500) {
    return { isValid: false, error: 'Keep comments under 500 characters.' };
  }
  return { isValid: true, error: '' };
}

export function validateChatMessage(text) {
  if (!text || !text.trim()) {
    return { isValid: false, error: 'Enter a message first.' };
  }
  if (text.trim().length > 280) {
    return { isValid: false, error: 'Keep chat messages under 280 characters.' };
  }
  return { isValid: true, error: '' };
}

export function formatReferralClipboardText(post) {
  return [
    `Referral Request: ${post.fullName}`,
    `Company: ${post.company} | Role: ${post.role} | Job ID: ${post.jobId}`,
    `Standout Edge: ${post.differentiator}`,
    `Why Fit: ${post.message}`,
    `Resume: ${post.resumeUrl}`,
    post.coverLetterUrl ? `Cover Letter: ${post.coverLetterUrl}` : null,
    `Shared via ReferKardo (#OpentoRefer)`,
  ]
    .filter(Boolean)
    .join('\n');
}