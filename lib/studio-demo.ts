/**
 * Studio Demo-Daten – werden als Fallback angezeigt wenn die API nicht erreichbar ist.
 * Ermoeglicht das Testen aller Studio-Screens ohne laufendes Backend.
 */

import type {
  Course, CourseModule, CourseLesson, Enrollment,
  MediaItem, Review, F2FPricing, F2FSlot, F2FBooking,
  Announcement, StudioDashboardKPIs,
  FinanceOverview, Coupon, MentorPayout, MentorProfile,
} from '../types/studio';

// ── Dashboard ──────────────────────────────────────────────

export const DEMO_KPIS: StudioDashboardKPIs = {
  total_students: 142,
  active_courses: 5,
  total_revenue_cents: 892500,
  avg_rating: 4.7,
  new_enrollments_this_month: 18,
  upcoming_sessions: 3,
  pending_reviews: 4,
  unread_messages: 7,
};

export const DEMO_ACTIVITY = [
  { type: 'enrollment', text: 'Lena M. hat sich fuer "Breathwork Basics" angemeldet', created_at: '2026-03-05T14:30:00Z' },
  { type: 'review', text: 'Neue 5-Sterne-Bewertung fuer "Achtsamkeit im Alltag"', created_at: '2026-03-05T10:15:00Z' },
  { type: 'booking', text: 'F2F-Session mit Thomas K. gebucht (60 Min)', created_at: '2026-03-04T18:00:00Z' },
  { type: 'enrollment', text: 'Jonas R. hat Modul 3 von "Yoga Fundamente" abgeschlossen', created_at: '2026-03-04T09:45:00Z' },
  { type: 'payout', text: 'Auszahlung von 245,00 EUR verarbeitet', created_at: '2026-03-03T12:00:00Z' },
  { type: 'media', text: 'Neue Meditation "Morgenritual" hochgeladen', created_at: '2026-03-02T08:30:00Z' },
];

// ── Kurse ──────────────────────────────────────────────────

const DEMO_LESSONS_YOGA: CourseLesson[] = [
  { id: 'l-1', module_id: 'm-1', title: 'Was ist Yoga?', description: 'Einfuehrung in die Geschichte', content_type: 'video', content_url: null, mux_asset_id: null, mux_playback_id: null, duration_seconds: 720, sort_order: 1, is_preview: true, created_at: '2026-01-15T10:00:00Z' },
  { id: 'l-2', module_id: 'm-1', title: 'Atemtechniken', description: 'Pranayama Grundlagen', content_type: 'video', content_url: null, mux_asset_id: null, mux_playback_id: null, duration_seconds: 1080, sort_order: 2, is_preview: false, created_at: '2026-01-15T10:00:00Z' },
  { id: 'l-3', module_id: 'm-1', title: 'Sonnengruss', description: 'Surya Namaskar Schritt fuer Schritt', content_type: 'video', content_url: null, mux_asset_id: null, mux_playback_id: null, duration_seconds: 1500, sort_order: 3, is_preview: false, created_at: '2026-01-15T10:00:00Z' },
];

const DEMO_LESSONS_BREATH: CourseLesson[] = [
  { id: 'l-4', module_id: 'm-3', title: 'Bauchatmung', description: null, content_type: 'video', content_url: null, mux_asset_id: null, mux_playback_id: null, duration_seconds: 600, sort_order: 1, is_preview: true, created_at: '2026-02-01T10:00:00Z' },
  { id: 'l-5', module_id: 'm-3', title: 'Box Breathing', description: '4-4-4-4 Technik', content_type: 'video', content_url: null, mux_asset_id: null, mux_playback_id: null, duration_seconds: 900, sort_order: 2, is_preview: false, created_at: '2026-02-01T10:00:00Z' },
];

const DEMO_MODULES: CourseModule[] = [
  { id: 'm-1', course_id: 'c-1', title: 'Grundlagen', description: 'Die Basis verstehen', sort_order: 1, scheduled_at: null, created_at: '2026-01-15T10:00:00Z', lessons: DEMO_LESSONS_YOGA },
  { id: 'm-2', course_id: 'c-1', title: 'Asanas fuer Anfaenger', description: 'Die wichtigsten Haltungen', sort_order: 2, scheduled_at: null, created_at: '2026-01-15T10:00:00Z', lessons: [] },
  { id: 'm-3', course_id: 'c-2', title: 'Atemtechniken', description: null, sort_order: 1, scheduled_at: null, created_at: '2026-02-01T10:00:00Z', lessons: DEMO_LESSONS_BREATH },
];

export const DEMO_COURSES: Course[] = [
  {
    id: 'c-1', mentor_id: 'demo', title: 'Yoga Fundamente', description: 'Ein 8-Wochen-Kurs fuer Anfaenger. Lerne die Grundlagen von Hatha Yoga, Atemtechniken und Meditation.',
    cover_url: null, category: 'online', status: 'active', price_cents: 14900, currency: 'EUR',
    max_participants: 30, participants_count: 22, location_name: null, location_address: null,
    location_lat: null, location_lng: null, starts_at: '2026-03-15T09:00:00Z', ends_at: '2026-05-10T09:00:00Z',
    recurrence_rule: null, drip_interval: 'weekly', rating_avg: 4.8, rating_count: 15,
    created_at: '2026-01-15T10:00:00Z', updated_at: '2026-03-01T10:00:00Z',
    modules: [DEMO_MODULES[0], DEMO_MODULES[1]],
  },
  {
    id: 'c-2', mentor_id: 'demo', title: 'Breathwork Basics', description: 'Entdecke die Kraft deines Atems. Holotropes Atmen, Box Breathing und mehr.',
    cover_url: null, category: 'online', status: 'active', price_cents: 7900, currency: 'EUR',
    max_participants: 50, participants_count: 38, location_name: null, location_address: null,
    location_lat: null, location_lng: null, starts_at: '2026-04-01T10:00:00Z', ends_at: null,
    recurrence_rule: null, drip_interval: null, rating_avg: 4.6, rating_count: 8,
    created_at: '2026-02-01T10:00:00Z', updated_at: '2026-03-02T10:00:00Z',
    modules: [DEMO_MODULES[2]],
  },
  {
    id: 'c-3', mentor_id: 'demo', title: 'Achtsamkeit im Alltag', description: 'Praktische Uebungen fuer mehr Praesenz im taeglichen Leben.',
    cover_url: null, category: 'online', status: 'active', price_cents: 4900, currency: 'EUR',
    max_participants: null, participants_count: 65, location_name: null, location_address: null,
    location_lat: null, location_lng: null, starts_at: null, ends_at: null,
    recurrence_rule: null, drip_interval: null, rating_avg: 4.9, rating_count: 28,
    created_at: '2025-11-01T10:00:00Z', updated_at: '2026-02-20T10:00:00Z',
    modules: [],
  },
  {
    id: 'c-4', mentor_id: 'demo', title: 'Kakao-Zeremonie Workshop', description: 'Ein Offline-Workshop in Muenchen. Erlebe die heilige Kakao-Zeremonie.',
    cover_url: null, category: 'offline', status: 'active', price_cents: 8900, currency: 'EUR',
    max_participants: 15, participants_count: 12, location_name: 'Yoga Loft Muenchen', location_address: 'Schellingstr. 42, 80799 Muenchen',
    location_lat: 48.152, location_lng: 11.577, starts_at: '2026-03-22T18:00:00Z', ends_at: '2026-03-22T21:00:00Z',
    recurrence_rule: null, drip_interval: null, rating_avg: 5.0, rating_count: 3,
    created_at: '2026-02-10T10:00:00Z', updated_at: '2026-03-01T10:00:00Z',
    modules: [],
  },
  {
    id: 'c-5', mentor_id: 'demo', title: 'Meditation fuer Fortgeschrittene', description: 'Tiefe Meditationspraktiken: Vipassana, Zen, Transzendentale Meditation.',
    cover_url: null, category: 'online', status: 'draft', price_cents: 19900, currency: 'EUR',
    max_participants: 20, participants_count: 0, location_name: null, location_address: null,
    location_lat: null, location_lng: null, starts_at: null, ends_at: null,
    recurrence_rule: null, drip_interval: 'weekly', rating_avg: 0, rating_count: 0,
    created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-04T10:00:00Z',
    modules: [],
  },
  {
    id: 'c-6', mentor_id: 'demo', title: 'Yoga Retreat Bali 2025', description: 'Archivierter Retreat-Kurs vom letzten Jahr.',
    cover_url: null, category: 'offline', status: 'archived', price_cents: 149900, currency: 'EUR',
    max_participants: 12, participants_count: 12, location_name: 'Ubud, Bali', location_address: null,
    location_lat: null, location_lng: null, starts_at: '2025-09-01T10:00:00Z', ends_at: '2025-09-08T10:00:00Z',
    recurrence_rule: null, drip_interval: null, rating_avg: 4.9, rating_count: 11,
    created_at: '2025-06-01T10:00:00Z', updated_at: '2025-10-01T10:00:00Z',
    modules: [],
  },
];

// ── Enrollments ───────────────────────────────────────────

export const DEMO_ENROLLMENTS: Record<string, Enrollment[]> = {
  'c-1': [
    { id: 'e-1', course_id: 'c-1', user_id: 'u-1', status: 'active', progress_percent: 75, enrolled_at: '2026-01-20T10:00:00Z', completed_at: null, user: { id: 'u-1', display_name: 'Lena Mueller', username: 'lena_m', avatar_url: null } },
    { id: 'e-2', course_id: 'c-1', user_id: 'u-2', status: 'active', progress_percent: 50, enrolled_at: '2026-01-22T10:00:00Z', completed_at: null, user: { id: 'u-2', display_name: 'Thomas Klein', username: 'thomas_k', avatar_url: null } },
    { id: 'e-3', course_id: 'c-1', user_id: 'u-3', status: 'completed', progress_percent: 100, enrolled_at: '2026-01-18T10:00:00Z', completed_at: '2026-03-01T10:00:00Z', user: { id: 'u-3', display_name: 'Sarah Weber', username: 'sarah_w', avatar_url: null } },
    { id: 'e-4', course_id: 'c-1', user_id: 'u-4', status: 'active', progress_percent: 30, enrolled_at: '2026-02-05T10:00:00Z', completed_at: null, user: { id: 'u-4', display_name: 'Jonas Richter', username: 'jonas_r', avatar_url: null } },
    { id: 'e-5', course_id: 'c-1', user_id: 'u-5', status: 'paused', progress_percent: 20, enrolled_at: '2026-02-10T10:00:00Z', completed_at: null, user: { id: 'u-5', display_name: 'Anna Schmidt', username: null, avatar_url: null } },
  ],
  'c-2': [
    { id: 'e-6', course_id: 'c-2', user_id: 'u-1', status: 'active', progress_percent: 40, enrolled_at: '2026-02-15T10:00:00Z', completed_at: null, user: { id: 'u-1', display_name: 'Lena Mueller', username: 'lena_m', avatar_url: null } },
    { id: 'e-7', course_id: 'c-2', user_id: 'u-6', status: 'active', progress_percent: 80, enrolled_at: '2026-02-05T10:00:00Z', completed_at: null, user: { id: 'u-6', display_name: 'Maria Lopez', username: 'maria_l', avatar_url: null } },
    { id: 'e-8', course_id: 'c-2', user_id: 'u-7', status: 'waitlisted', progress_percent: 0, enrolled_at: '2026-03-04T10:00:00Z', completed_at: null, user: { id: 'u-7', display_name: 'Felix Braun', username: 'felix_b', avatar_url: null } },
  ],
  'c-3': [
    { id: 'e-9', course_id: 'c-3', user_id: 'u-2', status: 'completed', progress_percent: 100, enrolled_at: '2025-12-01T10:00:00Z', completed_at: '2026-01-15T10:00:00Z', user: { id: 'u-2', display_name: 'Thomas Klein', username: 'thomas_k', avatar_url: null } },
  ],
  'c-4': [
    { id: 'e-10', course_id: 'c-4', user_id: 'u-3', status: 'active', progress_percent: 0, enrolled_at: '2026-03-01T10:00:00Z', completed_at: null, user: { id: 'u-3', display_name: 'Sarah Weber', username: 'sarah_w', avatar_url: null } },
  ],
};

// ── Mediathek ─────────────────────────────────────────────

export const DEMO_MEDIA: MediaItem[] = [
  { id: 'md-1', mentor_id: 'demo', title: 'Morgenmeditation', description: '15-minuetige gefuehrte Meditation fuer einen achtsamen Start in den Tag.', content_type: 'video', file_url: '', mux_asset_id: null, mux_playback_id: null, file_size_bytes: 85000000, duration_seconds: 900, thumbnail_url: null, tags: ['meditation', 'morgen'], is_micro_content: false, price_cents: 0, download_count: 234, rating_avg: 4.9, rating_count: 42, created_at: '2026-01-10T10:00:00Z', updated_at: '2026-01-10T10:00:00Z' },
  { id: 'md-2', mentor_id: 'demo', title: 'Atem-Quickie: 4-7-8', description: 'Schnelle Atemuebung gegen Stress.', content_type: 'video', file_url: '', mux_asset_id: null, mux_playback_id: null, file_size_bytes: 25000000, duration_seconds: 180, thumbnail_url: null, tags: ['breathwork', 'stress'], is_micro_content: true, price_cents: 0, download_count: 567, rating_avg: 4.7, rating_count: 89, created_at: '2026-02-05T10:00:00Z', updated_at: '2026-02-05T10:00:00Z' },
  { id: 'md-3', mentor_id: 'demo', title: 'Sound Healing Session', description: 'Klangschalen-Session fuer tiefe Entspannung.', content_type: 'audio', file_url: '', mux_asset_id: null, mux_playback_id: null, file_size_bytes: 42000000, duration_seconds: 1800, thumbnail_url: null, tags: ['sound', 'healing'], is_micro_content: false, price_cents: 490, download_count: 78, rating_avg: 4.8, rating_count: 15, created_at: '2026-01-20T10:00:00Z', updated_at: '2026-01-20T10:00:00Z' },
  { id: 'md-4', mentor_id: 'demo', title: 'Yoga Asana Guide', description: 'PDF-Handbuch mit 50 Yoga-Haltungen, illustriert.', content_type: 'pdf', file_url: '', mux_asset_id: null, mux_playback_id: null, file_size_bytes: 12000000, duration_seconds: null, thumbnail_url: null, tags: ['yoga', 'asana'], is_micro_content: false, price_cents: 990, download_count: 145, rating_avg: 4.5, rating_count: 23, created_at: '2025-12-01T10:00:00Z', updated_at: '2025-12-01T10:00:00Z' },
  { id: 'md-5', mentor_id: 'demo', title: 'Chakra Infografik', description: 'Uebersicht der 7 Chakren mit Zuordnungen.', content_type: 'image', file_url: '', mux_asset_id: null, mux_playback_id: null, file_size_bytes: 3500000, duration_seconds: null, thumbnail_url: null, tags: ['chakra', 'energie'], is_micro_content: true, price_cents: 0, download_count: 312, rating_avg: 4.3, rating_count: 18, created_at: '2026-02-20T10:00:00Z', updated_at: '2026-02-20T10:00:00Z' },
  { id: 'md-6', mentor_id: 'demo', title: 'Abendmeditation: Loslassen', description: 'Den Tag bewusst abschliessen.', content_type: 'audio', file_url: '', mux_asset_id: null, mux_playback_id: null, file_size_bytes: 35000000, duration_seconds: 1200, thumbnail_url: null, tags: ['meditation', 'abend'], is_micro_content: false, price_cents: 0, download_count: 189, rating_avg: 4.8, rating_count: 31, created_at: '2026-01-25T10:00:00Z', updated_at: '2026-01-25T10:00:00Z' },
  { id: 'md-7', mentor_id: 'demo', title: 'Pranayama: Nadi Shodhana', description: 'Wechselatmung fuer Balance und Klarheit.', content_type: 'video', file_url: '', mux_asset_id: null, mux_playback_id: null, file_size_bytes: 55000000, duration_seconds: 600, thumbnail_url: null, tags: ['breathwork', 'pranayama'], is_micro_content: false, price_cents: 290, download_count: 92, rating_avg: 4.6, rating_count: 14, created_at: '2026-02-15T10:00:00Z', updated_at: '2026-02-15T10:00:00Z' },
  { id: 'md-8', mentor_id: 'demo', title: 'Mantra: Om Namah Shivaya', description: '10-minuetige Mantra-Meditation.', content_type: 'audio', file_url: '', mux_asset_id: null, mux_playback_id: null, file_size_bytes: 18000000, duration_seconds: 600, thumbnail_url: null, tags: ['mantra', 'meditation'], is_micro_content: true, price_cents: 0, download_count: 445, rating_avg: 4.4, rating_count: 67, created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-01T10:00:00Z' },
];

// ── Finanzen ──────────────────────────────────────────────

export const DEMO_FINANCE: FinanceOverview = {
  total_revenue_cents: 892500,
  this_month_cents: 127800,
  pending_payout_cents: 45600,
  total_enrollments: 142,
  total_bookings: 23,
};

export const DEMO_COUPONS: Coupon[] = [
  { id: 'cp-1', mentor_id: 'demo', code: 'SOULEYA25', discount_percent: 25, discount_amount_cents: null, max_uses: 50, used_count: 18, valid_until: '2026-06-30T23:59:59Z', applies_to: null, target_id: null, is_active: true, created_at: '2026-01-01T10:00:00Z' },
  { id: 'cp-2', mentor_id: 'demo', code: 'FIRSTLIGHT', discount_percent: null, discount_amount_cents: 1000, max_uses: 100, used_count: 42, valid_until: null, applies_to: 'course', target_id: null, is_active: true, created_at: '2025-12-15T10:00:00Z' },
  { id: 'cp-3', mentor_id: 'demo', code: 'YOGA50', discount_percent: 50, discount_amount_cents: null, max_uses: 10, used_count: 10, valid_until: '2026-02-28T23:59:59Z', applies_to: 'course', target_id: 'c-1', is_active: false, created_at: '2026-01-15T10:00:00Z' },
];

export const DEMO_PAYOUTS: MentorPayout[] = [
  { id: 'po-1', mentor_id: 'demo', amount_cents: 24500, currency: 'EUR', stripe_transfer_id: 'tr_demo_1', status: 'completed', period_start: '2026-02-01T00:00:00Z', period_end: '2026-02-28T23:59:59Z', created_at: '2026-03-03T10:00:00Z' },
  { id: 'po-2', mentor_id: 'demo', amount_cents: 31200, currency: 'EUR', stripe_transfer_id: 'tr_demo_2', status: 'completed', period_start: '2026-01-01T00:00:00Z', period_end: '2026-01-31T23:59:59Z', created_at: '2026-02-03T10:00:00Z' },
  { id: 'po-3', mentor_id: 'demo', amount_cents: 45600, currency: 'EUR', stripe_transfer_id: null, status: 'pending', period_start: '2026-03-01T00:00:00Z', period_end: '2026-03-31T23:59:59Z', created_at: '2026-03-05T10:00:00Z' },
];

// ── Mentor-Profil ─────────────────────────────────────────

export const DEMO_MENTOR_PROFILE: MentorProfile = {
  id: 'demo',
  email: 'demo@souleya.com',
  username: 'demo_mentor',
  display_name: 'Maya Sonnenlicht',
  bio: 'Yoga-Lehrerin seit 12 Jahren. Meine Leidenschaft ist es, Menschen mit sich selbst zu verbinden.',
  avatar_url: null,
  mentor_bio: 'Ich bin zertifizierte Yoga-Lehrerin (RYT 500), Breathwork-Coach und Klangtherapeutin. Nach meiner Ausbildung in Rishikesh, Indien, habe ich ueber 3.000 Stunden Unterrichtserfahrung gesammelt. Mein Ansatz verbindet traditionelle Yoga-Philosophie mit modernen neurowissenschaftlichen Erkenntnissen.',
  mentor_tagline: 'Yoga-Lehrerin & Achtsamkeits-Coach',
  specializations: ['Yoga', 'Meditation', 'Breathwork', 'Sound Healing', 'Achtsamkeit'],
  mentor_website: 'https://maya-sonnenlicht.de',
  mentor_social: {
    instagram: '@maya.sonnenlicht',
    youtube: 'youtube.com/c/mayasonnenlicht',
    tiktok: '@maya_yoga',
    linkedin: '',
  },
};

// ── Reviews ───────────────────────────────────────────────

export const DEMO_REVIEWS: Review[] = [
  { id: 'r-1', reviewer_id: 'u-1', target_type: 'course', target_id: 'c-1', rating: 5, comment: 'Wunderbarer Kurs! Maya erklaert alles so klar und liebevoll.', reply_text: 'Vielen Dank, Lena! Es freut mich riesig.', reply_at: '2026-03-02T10:00:00Z', created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-02T10:00:00Z', reviewer: { id: 'u-1', display_name: 'Lena Mueller', username: 'lena_m', avatar_url: null } },
  { id: 'r-2', reviewer_id: 'u-2', target_type: 'course', target_id: 'c-1', rating: 5, comment: 'Perfekt fuer Anfaenger. Die Atemuebungen haben mir besonders geholfen.', reply_text: null, reply_at: null, created_at: '2026-02-28T10:00:00Z', updated_at: '2026-02-28T10:00:00Z', reviewer: { id: 'u-2', display_name: 'Thomas Klein', username: 'thomas_k', avatar_url: null } },
  { id: 'r-3', reviewer_id: 'u-6', target_type: 'course', target_id: 'c-2', rating: 4, comment: 'Sehr gut strukturiert. Wuensche mir noch mehr fortgeschrittene Techniken.', reply_text: null, reply_at: null, created_at: '2026-03-03T10:00:00Z', updated_at: '2026-03-03T10:00:00Z', reviewer: { id: 'u-6', display_name: 'Maria Lopez', username: 'maria_l', avatar_url: null } },
  { id: 'r-4', reviewer_id: 'u-3', target_type: 'course', target_id: 'c-3', rating: 5, comment: 'Hat mein Leben veraendert. Ich bin so viel achtsamer im Alltag geworden.', reply_text: null, reply_at: null, created_at: '2026-03-04T10:00:00Z', updated_at: '2026-03-04T10:00:00Z', reviewer: { id: 'u-3', display_name: 'Sarah Weber', username: 'sarah_w', avatar_url: null } },
];

// ── F2F ───────────────────────────────────────────────────

export const DEMO_F2F_PRICINGS: F2FPricing[] = [
  { id: 'fp-1', mentor_id: 'demo', duration_minutes: 30, price_cents: 4900, label: 'Kurz-Beratung', is_active: true, created_at: '2026-01-01T10:00:00Z' },
  { id: 'fp-2', mentor_id: 'demo', duration_minutes: 60, price_cents: 8900, label: 'Standard-Session', is_active: true, created_at: '2026-01-01T10:00:00Z' },
  { id: 'fp-3', mentor_id: 'demo', duration_minutes: 90, price_cents: 12900, label: 'Intensiv-Session', is_active: true, created_at: '2026-01-01T10:00:00Z' },
];

export const DEMO_F2F_SLOTS: F2FSlot[] = [
  { id: 'fs-1', mentor_id: 'demo', starts_at: '2026-03-10T10:00:00Z', duration_minutes: 60, status: 'available', created_at: '2026-03-01T10:00:00Z' },
  { id: 'fs-2', mentor_id: 'demo', starts_at: '2026-03-10T14:00:00Z', duration_minutes: 30, status: 'booked', created_at: '2026-03-01T10:00:00Z' },
  { id: 'fs-3', mentor_id: 'demo', starts_at: '2026-03-12T11:00:00Z', duration_minutes: 90, status: 'available', created_at: '2026-03-01T10:00:00Z' },
];

export const DEMO_F2F_BOOKINGS: F2FBooking[] = [
  { id: 'fb-1', slot_id: 'fs-2', pricing_id: 'fp-1', mentor_id: 'demo', client_id: 'u-2', status: 'confirmed', payment_intent_id: null, amount_cents: 4900, video_room_id: null, rating: null, completed_at: null, created_at: '2026-03-05T10:00:00Z', client: { id: 'u-2', display_name: 'Thomas Klein', username: 'thomas_k', avatar_url: null } },
];

// ── Ankuendigungen ────────────────────────────────────────

export const DEMO_ANNOUNCEMENTS: Announcement[] = [
  { id: 'an-1', mentor_id: 'demo', course_id: 'c-1', title: 'Neues Modul verfuegbar!', body: 'Liebe Teilnehmer, Modul 3 "Fortgeschrittene Asanas" ist ab sofort freigeschaltet.', sent_at: '2026-03-01T10:00:00Z', recipient_count: 22, open_rate: 0.68 },
  { id: 'an-2', mentor_id: 'demo', course_id: null, title: 'Oster-Special: 25% Rabatt', body: 'Nutzt den Code SOULEYA25 fuer 25% auf alle Kurse bis Ende Juni!', sent_at: '2026-02-20T10:00:00Z', recipient_count: 142, open_rate: 0.45 },
];
