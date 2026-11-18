import { FORTY_EIGHT_HOURS_MS, isWithin48Hours } from '../utils/validators';

const STORAGE_KEY = 'openref_posts_v3';
const CHAT_STORAGE_KEY = 'openref_chat_v1';

function extractOrigin(raw) {
  const cleaned = (raw || '').trim().replace(/^["']|["']$/g, '');
  if (!cleaned) return '';
  try {
    return new URL(cleaned).origin;
  } catch {
    return cleaned.replace(/\/+$/, '');
  }
}

const RAW_URL = extractOrigin(import.meta.env.VITE_SUPABASE_URL);
const RAW_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim().replace(/^["']|["']$/g, '');

const SEED_POSTS = [
  {
    id: 'seed-1',
    fullName: 'Ananya Rao',
    company: 'Wipro',
    jobId: '218041',
    role: 'Developer L1',
    differentiator: 'IEEE Research Author & Smart India Hackathon Finalist',
    message:
      'Computer Science graduate skilled in React, JavaScript, SQL, and Vitest unit testing. Ready for immediate Hyderabad joining.',
    resumeUrl: 'https://drive.google.com/file/d/1ExampleResumeLinkWipro/view',
    coverLetterUrl: 'https://docs.google.com/document/d/1ExampleCoverLetter/edit',
    createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    comments: [],
  },
];

const SEED_CHAT = [
  {
    id: 'chat-1',
    senderAlias: 'TechRecruiter_Hyd',
    messageText: 'Tip: Make sure your Google Drive link access is set to "Anyone with the link"!',
    createdAt: new Date(Date.now() - 600 * 1000).toISOString(),
  },
];

function isCloudEnabled() {
  return Boolean(RAW_URL && RAW_KEY);
}

function getSupabaseHeaders(extra = {}) {
  const headers = {
    apikey: RAW_KEY,
    ...extra,
  };
  if (RAW_KEY.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${RAW_KEY}`;
  }
  return headers;
}

export async function fetchReferrals() {
  const cutoffIso = new Date(Date.now() - FORTY_EIGHT_HOURS_MS).toISOString();

  if (isCloudEnabled()) {
    // 1. Trigger background purge of requests older than 48 hours
    fetch(`${RAW_URL}/rest/v1/referrals?created_at=lt.${encodeURIComponent(cutoffIso)}`, {
      method: 'DELETE',
      headers: getSupabaseHeaders(),
    }).catch(() => {});

    // 2. Fetch active requests (< 48h old) & comments
    const [postsRes, commentsRes] = await Promise.all([
      fetch(
        `${RAW_URL}/rest/v1/referrals?select=*&created_at=gte.${encodeURIComponent(
          cutoffIso
        )}&order=created_at.desc`,
        { headers: getSupabaseHeaders() }
      ),
      fetch(`${RAW_URL}/rest/v1/referral_comments?select=*&order=created_at.asc`, {
        headers: getSupabaseHeaders(),
      }),
    ]);

    if (!postsRes.ok) {
      const detail = await postsRes.text();
      throw new Error(`Supabase (${postsRes.status}): ${detail || 'Failed to load referrals'}`);
    }

    const rows = await postsRes.json();
    const commentRows = commentsRes.ok ? await commentsRes.json() : [];

    const commentsByPost = commentRows.reduce((acc, c) => {
      if (!acc[c.referral_id]) acc[c.referral_id] = [];
      acc[c.referral_id].push({
        id: c.id,
        authorAlias: c.author_alias || 'Anonymous',
        commentText: c.comment_text,
        createdAt: c.created_at,
      });
      return acc;
    }, {});

    return rows
      .filter((r) => isWithin48Hours(r.created_at))
      .map((r) => ({
        id: r.id,
        fullName: r.full_name,
        company: r.company,
        jobId: r.job_id,
        role: r.role,
        differentiator: r.differentiator || 'Verified Candidate',
        message: r.message,
        resumeUrl: r.resume_url,
        coverLetterUrl: r.cover_letter_url,
        createdAt: r.created_at,
        comments: commentsByPost[r.id] || [],
      }));
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  const parsed = saved ? JSON.parse(saved) : SEED_POSTS;
  const active = parsed.filter((p) => isWithin48Hours(p.createdAt));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
  return active;
}

export async function createReferral(payload) {
  if (isCloudEnabled()) {
    const res = await fetch(`${RAW_URL}/rest/v1/referrals`, {
      method: 'POST',
      headers: getSupabaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify({
        full_name: payload.fullName.trim(),
        company: payload.company.trim(),
        job_id: payload.jobId.trim(),
        role: payload.role.trim(),
        differentiator: payload.differentiator.trim(),
        message: payload.message.trim(),
        resume_url: payload.resumeUrl.trim(),
        cover_letter_url: payload.coverLetterUrl?.trim() || null,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Supabase (${res.status}): ${detail || 'Failed to publish post'}`);
    }
    return fetchReferrals();
  }

  const current = await fetchReferrals();
  const newItem = {
    id: crypto.randomUUID(),
    ...payload,
    createdAt: new Date().toISOString(),
    comments: [],
  };
  const updated = [newItem, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function createComment(referralId, { authorAlias, commentText }) {
  const cleanAlias = authorAlias?.trim() || 'Anonymous';
  const cleanText = commentText.trim();

  if (isCloudEnabled()) {
    const res = await fetch(`${RAW_URL}/rest/v1/referral_comments`, {
      method: 'POST',
      headers: getSupabaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify({
        referral_id: referralId,
        author_alias: cleanAlias,
        comment_text: cleanText,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Supabase (${res.status}): ${detail || 'Failed to post comment'}`);
    }
    return fetchReferrals();
  }

  const current = await fetchReferrals();
  const updated = current.map((post) => {
    if (post.id !== referralId) return post;
    return {
      ...post,
      comments: [
        ...(post.comments || []),
        {
          id: crypto.randomUUID(),
          authorAlias: cleanAlias,
          commentText: cleanText,
          createdAt: new Date().toISOString(),
        },
      ],
    };
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function fetchChatMessages() {
  if (isCloudEnabled()) {
    const res = await fetch(
      `${RAW_URL}/rest/v1/community_chat?select=*&order=created_at.desc&limit=50`,
      { headers: getSupabaseHeaders() }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return rows.reverse().map((m) => ({
      id: m.id,
      senderAlias: m.sender_alias || 'Guest',
      messageText: m.message_text,
      createdAt: m.created_at,
    }));
  }

  const saved = localStorage.getItem(CHAT_STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(SEED_CHAT));
    return SEED_CHAT;
  }
  return JSON.parse(saved);
}

export async function sendChatMessage({ senderAlias, messageText }) {
  const cleanAlias = senderAlias?.trim() || 'Guest';
  const cleanText = messageText.trim();

  if (isCloudEnabled()) {
    const res = await fetch(`${RAW_URL}/rest/v1/community_chat`, {
      method: 'POST',
      headers: getSupabaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify({
        sender_alias: cleanAlias,
        message_text: cleanText,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Chat error (${res.status}): ${detail}`);
    }
    return fetchChatMessages();
  }

  const current = await fetchChatMessages();
  const updated = [
    ...current,
    {
      id: crypto.randomUUID(),
      senderAlias: cleanAlias,
      messageText: cleanText,
      createdAt: new Date().toISOString(),
    },
  ];
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}