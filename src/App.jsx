import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Clock,
  ExternalLink,
  FileText,
  Info,
  Megaphone,
  MessageCircle,
  MessageSquare,
  PlusCircle,
  Search,
  Send,
  Sparkles,
  UserCircle2,
} from 'lucide-react';
import {
  validateReferralInput,
  validateCommentInput,
  validateChatMessage,
  formatReferralClipboardText,
  getRemainingHours,
} from './utils/validators';
import {
  fetchReferrals,
  createReferral,
  createComment,
  fetchChatMessages,
  sendChatMessage,
} from './services/referralService';

const INITIAL_FORM = {
  fullName: '',
  company: '',
  jobId: '',
  role: '',
  differentiator: '',
  message: '',
  resumeUrl: '',
  coverLetterUrl: '',
};

const DIFFERENTIATOR_PRESETS = [
  'Tier-1 Institution (IIT/NIT/IIIT)',
  '2+ Yrs Relevant Work Exp',
  'Published Patent / Research Paper',
  'Hackathon Winner / Open Source',
  'Immediate Joiner (0 Days Notice)',
];

function formatTimeAgo(isoString) {
  if (!isoString) return 'Just now';
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function CircularBrandEmblem({ size = 'md' }) {
  const dimensions = size === 'sm' ? 'w-12 h-12' : 'w-14 h-14';
  return (
    <div
      className={`${dimensions} shrink-0 select-none rounded-full shadow-xs ring-2 ring-indigo-100`}
      title="ReferKardo — #OpentoRefer"
    >
      <svg viewBox="0 0 120 120" className="w-full h-full block">
        <circle cx="60" cy="60" r="56" fill="#ffffff" stroke="#0f172a" strokeWidth="4.5" />
        <circle cx="60" cy="60" r="49" fill="none" stroke="#e2e8f0" strokeWidth="1.5" />
        <text
          x="60"
          y="56"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight="bold"
          fontSize="11.5"
          fill="#0f172a"
        >
          #OpentoRefer
        </text>
        <text
          x="60"
          y="73"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="700"
          fontSize="8.5"
          letterSpacing="1.2"
          fill="#4f46e5"
        >
          REFERKARDO
        </text>
      </svg>
    </div>
  );
}

export default function App() {
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Collapsible comments state
  const [openComments, setOpenComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});

  // Live community chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatAlias, setChatAlias] = useState('');
  const [chatText, setChatText] = useState('');
  const [chatError, setChatError] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchReferrals()
      .then((data) => {
        setPosts(data);
        setApiError('');
      })
      .catch((err) => setApiError(err.message))
      .finally(() => setLoading(false));

    fetchChatMessages().then(setChatMessages).catch(() => {});

    const timer = setInterval(() => {
      fetchChatMessages().then(setChatMessages).catch(() => {});
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return posts;

    return posts.filter((p) => {
      const searchableText = [
        p.company,
        p.jobId,
        p.role,
        p.fullName,
        p.differentiator,
        p.message,
      ]
        .map((val) => String(val ?? '').toLowerCase())
        .join(' ');
      return searchableText.includes(q);
    });
  }, [posts, search]);

  function toggleComments(postId) {
    setOpenComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const check = validateReferralInput(form);
    if (!check.isValid) {
      setErrors(check.errors);
      return;
    }
    setSubmitting(true);
    setApiError('');
    try {
      const updated = await createReferral(form);
      setPosts(updated);
      setForm(INITIAL_FORM);
      setErrors({});
      setShowForm(false);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy(post) {
    await navigator.clipboard.writeText(formatReferralClipboardText(post));
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function updateDraft(postId, patch) {
    setCommentDrafts((prev) => ({
      ...prev,
      [postId]: {
        alias: prev[postId]?.alias || '',
        text: prev[postId]?.text || '',
        error: '',
        posting: false,
        ...patch,
      },
    }));
  }

  async function handleAddComment(e, postId) {
    e.preventDefault();
    const draft = commentDrafts[postId] || { alias: '', text: '' };
    const check = validateCommentInput(draft.text);
    if (!check.isValid) {
      updateDraft(postId, { error: check.error });
      return;
    }

    updateDraft(postId, { posting: true, error: '' });
    try {
      const updated = await createComment(postId, {
        authorAlias: draft.alias,
        commentText: draft.text,
      });
      setPosts(updated);
      setCommentDrafts((prev) => ({
        ...prev,
        [postId]: { alias: draft.alias, text: '', error: '', posting: false },
      }));
    } catch (err) {
      updateDraft(postId, { posting: false, error: err.message });
    }
  }

  async function handleSendChat(e) {
    e.preventDefault();
    const check = validateChatMessage(chatText);
    if (!check.isValid) {
      setChatError(check.error);
      return;
    }
    setSendingChat(true);
    setChatError('');
    try {
      const updated = await sendChatMessage({
        senderAlias: chatAlias,
        messageText: chatText,
      });
      setChatMessages(updated);
      setChatText('');
    } catch (err) {
      setChatError(err.message);
    } finally {
      setSendingChat(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header with Circular Site Image & #OpentoRefer Branding */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CircularBrandEmblem />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-extrabold text-xl tracking-tight text-slate-900">
                  ReferKardo
                </h1>
                <span className="font-serif text-sm font-semibold text-slate-900 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full">
                  #OpentoRefer
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Zero-login public job referral board &amp; live peer community
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            {showForm ? 'Close Form' : 'Post Referral Request'}
          </button>
        </div>
      </header>

      {/* 48-Hour Auto-Cleanup Notice Banner */}
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start sm:items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <p>
              <span className="font-semibold">48-Hour Freshness Policy:</span> All referral requests
              on <span className="font-semibold">ReferKardo</span> are automatically deleted after{' '}
              <span className="font-semibold">2 days (48 hours)</span> so referrers never see stale
              posts. Missed out? Simply re-post anytime!
            </p>
          </div>
          <span className="hidden md:inline font-serif font-semibold text-slate-800 shrink-0">
            #OpentoRefer
          </span>
        </div>
      </div>

      {/* Main 3-Column Workspace: Left Ad Banner (2) | Center Feed (7) | Right Live Chat (3) */}
      <main className="max-w-7xl w-full mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start flex-1">
        {/* LEFT COLUMN (2 cols): Shaded Vertical Advertisement Banner */}
        <aside className="lg:col-span-2 lg:sticky lg:top-20 rounded-xl border-2 border-dashed border-slate-300 bg-gradient-to-b from-slate-200/80 via-slate-100 to-slate-200/90 p-3.5 shadow-inner flex flex-col justify-between min-h-[220px] lg:h-[540px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-300/80 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                Advertisement
              </span>
              <Megaphone className="w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="bg-white/75 backdrop-blur-xs border border-slate-200/90 rounded-lg p-3 text-center space-y-2.5 shadow-2xs">
              <div className="flex justify-center">
                <CircularBrandEmblem size="sm" />
              </div>
              <p className="font-serif text-xs font-bold text-slate-900">#OpentoRefer</p>
              <p className="text-[11px] font-semibold text-slate-700 leading-snug">
                Sponsored Banner Space
              </p>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Reach active job seekers &amp; verified tech referrers daily on{' '}
                <span className="font-semibold text-slate-700">ReferKardo</span>.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-300/70 text-center space-y-1.5 mt-4 lg:mt-0">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
              Ad Slot &bull; 160&times;600
            </p>
            <div className="w-full py-1.5 px-2 rounded-lg bg-slate-800 text-white text-[11px] font-medium">
              Your Brand Here
            </div>
          </div>
        </aside>

        {/* CENTER COLUMN (7 cols): Form, Search & Referral Feed */}
        <section className="lg:col-span-7 space-y-5">
          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-lg">
              Database Notice: {apiError}
            </div>
          )}

          {/* Submission Drawer */}
          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4"
            >
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-base">Submit Public Referral Request</h2>
                  <p className="text-xs text-slate-500">
                    Active for 48 hours. Ensure Google Drive links are set to &ldquo;Anyone with
                    the link can view&rdquo;.
                  </p>
                </div>
                <span className="font-serif text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded">
                  #OpentoRefer
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Kiran Kumar"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                  {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Target Company *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Wipro"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                  {errors.company && <p className="text-xs text-red-600 mt-1">{errors.company}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Job ID *</label>
                  <input
                    type="text"
                    placeholder="e.g., 218041"
                    value={form.jobId}
                    onChange={(e) => setForm({ ...form, jobId: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                  {errors.jobId && <p className="text-xs text-red-600 mt-1">{errors.jobId}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Role Title *</label>
                  <input
                    type="text"
                    placeholder="e.g., Developer L1"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                  {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role}</p>}
                </div>
              </div>

              {/* Standout Differentiator Field with Quick-Pick Pills */}
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-lg p-3.5 space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-indigo-950">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    What Makes You Stand Out? * (Institution, Exp, Patent, Research, CTC, etc.)
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 1 Published Patent & 2 Yrs React Exp  OR  NIT Warangal CSE"
                  value={form.differentiator}
                  onChange={(e) => setForm({ ...form, differentiator: e.target.value })}
                  className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {DIFFERENTIATOR_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setForm({ ...form, differentiator: preset })}
                      className="text-[11px] bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full cursor-pointer transition"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
                {errors.differentiator && (
                  <p className="text-xs text-red-600">{errors.differentiator}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Resume Google Drive Link *
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/..."
                    value={form.resumeUrl}
                    onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                  {errors.resumeUrl && (
                    <p className="text-xs text-red-600 mt-1">{errors.resumeUrl}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cover Letter Drive Link (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://docs.google.com/document/d/..."
                    value={form.coverLetterUrl}
                    onChange={(e) => setForm({ ...form, coverLetterUrl: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                  {errors.coverLetterUrl && (
                    <p className="text-xs text-red-600 mt-1">{errors.coverLetterUrl}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Suitability Pitch / Skills Summary *
                </label>
                <textarea
                  rows={3}
                  placeholder="Highlight key tech stack, project links, and why you fit this Job ID..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
                {errors.message && <p className="text-xs text-red-600 mt-1">{errors.message}</p>}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Publishing...' : 'Publish Request (48h)'}
                </button>
              </div>
            </form>
          )}

          {/* Full-Width Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search Company, Job ID (e.g. 218041), Differentiator (Patent, NIT), or Skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm shadow-xs"
            />
          </div>

          {/* Referral Feed */}
          {loading ? (
            <div className="text-center py-12 text-sm text-slate-500">Loading active requests...</div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPosts.map((post) => {
                const draft = commentDrafts[post.id] || {
                  alias: '',
                  text: '',
                  error: '',
                  posting: false,
                };
                const comments = post.comments || [];
                const isCommentsOpen = Boolean(openComments[post.id]);
                const hoursLeft = getRemainingHours(post.createdAt);

                return (
                  <article
                    key={post.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3.5"
                  >
                    {/* Top Row: Role, Company, Job ID & Expiry Countdown */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-base text-slate-900">{post.role}</h3>
                          <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full">
                            {post.company}
                          </span>
                          <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded">
                            ID: {post.jobId}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Posted by{' '}
                          <span className="font-medium text-slate-700">{post.fullName}</span> &bull;{' '}
                          {formatTimeAgo(post.createdAt)} &bull;{' '}
                          <span className="font-serif text-slate-700">#OpentoRefer</span>
                        </p>
                      </div>

                      <span
                        title="Automatically removed 48 hours after posting"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full"
                      >
                        <Clock className="w-3 h-3 text-amber-600" />
                        Expires in {hoursLeft}h
                      </span>
                    </div>

                    {/* Visible Standout Differentiator Mark */}
                    {post.differentiator && (
                      <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium px-3 py-1.5 rounded-lg">
                        <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          <span className="font-semibold text-emerald-700">Standout Edge:</span>{' '}
                          {post.differentiator}
                        </span>
                      </div>
                    )}

                    {/* Suitability Pitch */}
                    <p className="text-sm text-slate-700 leading-relaxed">{post.message}</p>

                    {/* Document Links, Comments Toggle & Copy Action */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={post.resumeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          View Resume
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        {post.coverLetterUrl && (
                          <a
                            href={post.coverLetterUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50"
                          >
                            Cover Letter
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleComments(post.id)}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border cursor-pointer transition ${
                            isCommentsOpen
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'text-slate-600 hover:text-slate-900 border-slate-200 bg-white'
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Comments ({comments.length})</span>
                          {isCommentsOpen ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => handleCopy(post)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer"
                        >
                          <ClipboardCopy className="w-3.5 h-3.5" />
                          {copiedId === post.id ? 'Copied!' : 'Copy Details'}
                        </button>
                      </div>
                    </div>

                    {/* Collapsible Anonymous Community Comments Drawer */}
                    {isCommentsOpen && (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-4 space-y-3">
                        <div className="text-xs font-semibold text-slate-700">
                          Community Notes &amp; Anonymous Feedback ({comments.length})
                        </div>

                        {comments.length > 0 ? (
                          <div className="space-y-2.5 pl-3 border-l-2 border-indigo-200">
                            {comments.map((c) => (
                              <div key={c.id} className="text-xs space-y-0.5">
                                <div className="flex items-center gap-1.5 text-slate-500">
                                  <UserCircle2 className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="font-semibold text-slate-700">
                                    {c.authorAlias || 'Anonymous'}
                                  </span>
                                  <span>&bull;</span>
                                  <span>{formatTimeAgo(c.createdAt)}</span>
                                </div>
                                <p className="text-slate-700 leading-relaxed pl-5">
                                  {c.commentText}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">
                            No comments yet. Be the first to leave feedback or referral status below.
                          </p>
                        )}

                        <form
                          onSubmit={(e) => handleAddComment(e, post.id)}
                          className="flex flex-col sm:flex-row gap-2 pt-1"
                        >
                          <input
                            type="text"
                            placeholder="Alias (optional: Anonymous)"
                            value={draft.alias}
                            onChange={(e) => updateDraft(post.id, { alias: e.target.value })}
                            className="sm:w-36 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Leave feedback or referral confirmation anonymously..."
                            value={draft.text}
                            onChange={(e) => updateDraft(post.id, { text: e.target.value })}
                            className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                          />
                          <button
                            type="submit"
                            disabled={draft.posting}
                            className="inline-flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            {draft.posting ? 'Posting...' : 'Comment'}
                          </button>
                        </form>
                        {draft.error && <p className="text-xs text-red-600">{draft.error}</p>}
                      </div>
                    )}
                  </article>
                );
              })}

              {filteredPosts.length === 0 && (
                <div className="text-center py-12 bg-white border border-slate-200 rounded-xl text-sm text-slate-500">
                  No active referral requests match your search.
                </div>
              )}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN (3 cols): Sticky Live Community Chat Box */}
        <aside className="lg:col-span-3 lg:sticky lg:top-20 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-[540px]">
          <div className="px-3.5 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-indigo-600" />
              <h2 className="font-semibold text-xs text-slate-900">Live Community Lounge</h2>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>

          <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 text-[11px] text-slate-500">
            Quick questions &amp; hiring updates on{' '}
            <span className="font-serif font-semibold text-slate-700">#OpentoRefer</span>.
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                Say hello or ask a quick referral question!
              </p>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-slate-50 border border-slate-200/70 rounded-lg px-2.5 py-2 space-y-0.5"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-indigo-700">
                      {msg.senderAlias || 'Guest'}
                    </span>
                    <span className="text-slate-400">{formatTimeAgo(msg.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed break-words">
                    {msg.messageText}
                  </p>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={handleSendChat}
            className="p-3 border-t border-slate-200 bg-slate-50/70 space-y-2 rounded-b-xl"
          >
            <input
              type="text"
              placeholder="Alias (optional)"
              value={chatAlias}
              onChange={(e) => setChatAlias(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
            />
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Ask a quick query..."
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
              />
              <button
                type="submit"
                disabled={sendingChat}
                aria-label="Send chat message"
                className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            {chatError && <p className="text-[11px] text-red-600">{chatError}</p>}
          </form>
        </aside>
      </main>

      {/* Branded Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <CircularBrandEmblem size="sm" />
            <div>
              <span className="font-bold text-slate-800">ReferKardo</span> &bull;{' '}
              <span className="font-serif font-semibold text-slate-900">#OpentoRefer</span>
            </div>
          </div>
          <p>Zero-signup community referral board &bull; Posts auto-expire every 48 hours</p>
        </div>
      </footer>
    </div>
  );
}