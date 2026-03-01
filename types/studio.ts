// ── Kurse ────────────────────────────────────────────────
export type CourseCategory = 'online' | 'offline' | 'recurring' | 'live';
export type CourseStatus = 'draft' | 'active' | 'archived' | 'sold_out';

export interface Course {
  id: string;
  mentor_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  category: CourseCategory;
  status: CourseStatus;
  price_cents: number;
  currency: string;
  max_participants: number | null;
  participants_count: number;
  location_name: string | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  starts_at: string | null;
  ends_at: string | null;
  recurrence_rule: string | null;
  drip_interval: string | null;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
  modules?: CourseModule[];
  mentor?: { id: string; display_name: string | null; username: string | null; avatar_url: string | null };
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  scheduled_at: string | null;
  created_at: string;
  lessons?: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  content_type: string;
  content_url: string | null;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  duration_seconds: number | null;
  sort_order: number;
  is_preview: boolean;
  created_at: string;
}

export type EnrollmentStatus = 'active' | 'completed' | 'paused' | 'waitlisted';

export interface Enrollment {
  id: string;
  course_id: string;
  user_id: string;
  status: EnrollmentStatus;
  progress_percent: number;
  enrolled_at: string;
  completed_at: string | null;
  user?: { id: string; display_name: string | null; username: string | null; avatar_url: string | null };
}

export type LessonProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface LessonProgress {
  id: string;
  enrollment_id: string;
  lesson_id: string;
  status: LessonProgressStatus;
  watch_time_seconds: number;
  completed_at: string | null;
}

// ── DTOs ─────────────────────────────────────────────────
export interface CreateCourseData {
  title: string;
  description?: string;
  cover_url?: string;
  category?: CourseCategory;
  price_cents?: number;
  max_participants?: number;
  location_name?: string;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  starts_at?: string;
  ends_at?: string;
  recurrence_rule?: string;
  drip_interval?: string;
}

export interface UpdateCourseData extends Partial<CreateCourseData> {
  status?: CourseStatus;
}

export interface CreateModuleData {
  title: string;
  description?: string;
  sort_order?: number;
  scheduled_at?: string;
}

export interface CreateLessonData {
  title: string;
  description?: string;
  content_type: string;
  content_url?: string;
  duration_seconds?: number;
  sort_order?: number;
  is_preview?: boolean;
}

// ── Mediathek ────────────────────────────────────────────
export interface MediaItem {
  id: string;
  mentor_id: string;
  title: string;
  description: string | null;
  content_type: string;
  file_url: string;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  file_size_bytes: number | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  tags: string[];
  is_micro_content: boolean;
  price_cents: number;
  download_count: number;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMediaData {
  title: string;
  description?: string;
  content_type: string;
  file_url: string;
  file_size_bytes?: number;
  duration_seconds?: number;
  thumbnail_url?: string;
  tags?: string[];
  is_micro_content?: boolean;
  price_cents?: number;
}

export interface UpdateMediaData extends Partial<CreateMediaData> {}

// ── Bewertungen ──────────────────────────────────────────
export interface Review {
  id: string;
  reviewer_id: string;
  target_type: string;
  target_id: string;
  rating: number;
  comment: string | null;
  reply_text: string | null;
  reply_at: string | null;
  created_at: string;
  updated_at: string;
  reviewer?: { id: string; display_name: string | null; username: string | null; avatar_url: string | null };
}

export interface CreateReviewData {
  target_type: string;
  target_id: string;
  rating: number;
  comment?: string;
}

// ── Face2Face ────────────────────────────────────────────
export interface F2FPricing {
  id: string;
  mentor_id: string;
  duration_minutes: number;
  price_cents: number;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateF2FPricingData {
  duration_minutes: number;
  price_cents: number;
  label?: string;
}

export interface F2FSlot {
  id: string;
  mentor_id: string;
  starts_at: string;
  duration_minutes: number;
  status: string;
  created_at: string;
}

export interface CreateF2FSlotData {
  starts_at: string;
  duration_minutes: number;
}

export interface F2FBooking {
  id: string;
  slot_id: string;
  pricing_id: string;
  mentor_id: string;
  client_id: string;
  status: string;
  payment_intent_id: string | null;
  amount_cents: number;
  video_room_id: string | null;
  rating: number | null;
  completed_at: string | null;
  created_at: string;
  client?: { id: string; display_name: string | null; username: string | null; avatar_url: string | null };
  slot?: F2FSlot;
}

export interface BookSlotData {
  slot_id: string;
  pricing_id: string;
}

// ── Finanzen ─────────────────────────────────────────────
export interface Coupon {
  id: string;
  mentor_id: string;
  code: string;
  discount_percent: number | null;
  discount_amount_cents: number | null;
  max_uses: number | null;
  used_count: number;
  valid_until: string | null;
  applies_to: string | null;
  target_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateCouponData {
  code: string;
  discount_percent?: number;
  discount_amount_cents?: number;
  max_uses?: number;
  valid_until?: string;
  applies_to?: string;
  target_id?: string;
}

export interface MentorPayout {
  id: string;
  mentor_id: string;
  amount_cents: number;
  currency: string;
  stripe_transfer_id: string | null;
  status: string;
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface FinanceOverview {
  total_revenue_cents: number;
  this_month_cents: number;
  pending_payout_cents: number;
  total_enrollments: number;
  total_bookings: number;
}

// ── Ankuendigungen ───────────────────────────────────────
export interface Announcement {
  id: string;
  mentor_id: string;
  course_id: string | null;
  title: string;
  body: string;
  sent_at: string;
  recipient_count: number;
  open_rate: number;
}

export interface CreateAnnouncementData {
  title: string;
  body: string;
  course_id?: string;
}

export interface AutoMailTemplate {
  id: string;
  mentor_id: string;
  trigger_type: string;
  subject: string;
  body: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateAutoMailData {
  trigger_type: string;
  subject: string;
  body: string;
  is_active?: boolean;
}

// ── Dashboard KPIs ───────────────────────────────────────
export interface StudioDashboardKPIs {
  total_students: number;
  active_courses: number;
  total_revenue_cents: number;
  avg_rating: number;
  new_enrollments_this_month: number;
  upcoming_sessions: number;
  pending_reviews: number;
  unread_messages: number;
}
