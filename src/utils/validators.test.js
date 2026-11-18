import { describe, it, expect } from 'vitest';
import {
  isValidDriveLink,
  isWithin48Hours,
  validateReferralInput,
  validateCommentInput,
  validateChatMessage,
  formatReferralClipboardText,
} from '../utils/validators';

describe('OpenRef Validators & 48-Hour Expiry Logic', () => {
  it('accepts valid HTTPS Google Drive and Docs URLs', () => {
    expect(isValidDriveLink('https://drive.google.com/file/d/123abc/view')).toBe(true);
    expect(isValidDriveLink('https://docs.google.com/document/d/456xyz/edit')).toBe(true);
  });

  it('rejects non-Drive URLs and malformed strings', () => {
    expect(isValidDriveLink('http://drive.google.com/file/d/123')).toBe(false);
    expect(isValidDriveLink('https://dropbox.com/s/resume.pdf')).toBe(false);
  });

  it('enforces 48-hour auto-expiration window accurately', () => {
    const now = Date.now();
    const freshPost = new Date(now - 10 * 60 * 60 * 1000).toISOString(); // 10h ago
    const expiredPost = new Date(now - 49 * 60 * 60 * 1000).toISOString(); // 49h ago
    expect(isWithin48Hours(freshPost, now)).toBe(true);
    expect(isWithin48Hours(expiredPost, now)).toBe(false);
  });

  it('validates a complete referral payload including differentiator', () => {
    const result = validateReferralInput({
      fullName: 'Aarav Sharma',
      company: 'Wipro',
      jobId: '218041',
      role: 'Developer L1',
      differentiator: '1 Published Patent & NIT Graduate',
      message: 'Built full-stack React apps with Vitest unit tests and REST APIs.',
      resumeUrl: 'https://drive.google.com/file/d/sample123/view',
      coverLetterUrl: '',
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('validates anonymous comments and community chat messages', () => {
    expect(validateCommentInput('   ').isValid).toBe(false);
    expect(validateCommentInput('Referred you in the Wipro portal!').isValid).toBe(true);
    expect(validateChatMessage('').isValid).toBe(false);
    expect(validateChatMessage('Anyone referring for Wipro Hyderabad today?').isValid).toBe(true);
  });

 it('formats clean clipboard output including standout edge and ReferKardo branding', () => {
    const text = formatReferralClipboardText({
      fullName: 'Aarav Sharma',
      company: 'Wipro',
      role: 'Developer L1',
      jobId: '218041',
      differentiator: 'Published Research Paper in IEEE',
      message: 'Strong React and unit testing skills.',
      resumeUrl: 'https://drive.google.com/file/d/sample123/view',
    });
    expect(text).toContain('Standout Edge: Published Research Paper in IEEE');
    expect(text).toContain('ReferKardo (#OpentoRefer)');
  });
});