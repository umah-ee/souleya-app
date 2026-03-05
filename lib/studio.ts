import { apiFetch } from './api';
import type {
  Course, CourseModule, CourseLesson, Enrollment,
  MediaItem, CreateMediaData, UpdateMediaData,
  F2FPricing, F2FSlot, F2FBooking,
  CreateF2FPricingData, CreateF2FSlotData,
  Review, Announcement, StudioDashboardKPIs,
  CreateAnnouncementData, UpdateCourseData,
  CreateCourseData, CreateModuleData, CreateLessonData,
  FinanceOverview, Coupon, MentorPayout, CreateCouponData,
  MentorProfile, UpdateMentorProfileData,
} from '../types/studio';

// ── Dashboard ──────────────────────────────────────────────
export async function fetchDashboardKPIs(): Promise<StudioDashboardKPIs> {
  return apiFetch('/studio/dashboard/kpis');
}

export async function fetchRecentActivity(limit = 10) {
  return apiFetch<{ type: string; text: string; created_at: string }[]>(
    `/studio/dashboard/activity?limit=${limit}`,
  );
}

// ── Kurse ──────────────────────────────────────────────────
export async function fetchCourses(options?: { status?: string; page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  const qs = params.toString();
  return apiFetch<{ data: Course[]; total: number; hasMore: boolean }>(
    `/studio/courses${qs ? `?${qs}` : ''}`,
  );
}

export async function fetchCourse(id: string): Promise<Course> {
  return apiFetch(`/studio/courses/${id}`);
}

export async function createCourse(data: CreateCourseData): Promise<Course> {
  return apiFetch('/studio/courses', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateCourse(id: string, data: UpdateCourseData): Promise<Course> {
  return apiFetch(`/studio/courses/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteCourse(id: string): Promise<void> {
  await apiFetch(`/studio/courses/${id}`, { method: 'DELETE' });
}

// ── Module ──────────────────────────────────────────────────
export async function fetchModules(courseId: string): Promise<CourseModule[]> {
  return apiFetch(`/studio/courses/${courseId}/modules`);
}

export async function createModule(courseId: string, data: CreateModuleData): Promise<CourseModule> {
  return apiFetch(`/studio/courses/${courseId}/modules`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateModule(moduleId: string, data: Partial<CreateModuleData>): Promise<CourseModule> {
  return apiFetch(`/studio/courses/modules/${moduleId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteModule(moduleId: string): Promise<void> {
  await apiFetch(`/studio/courses/modules/${moduleId}`, { method: 'DELETE' });
}

// ── Lektionen ───────────────────────────────────────────────
export async function createLesson(moduleId: string, data: CreateLessonData): Promise<CourseLesson> {
  return apiFetch(`/studio/courses/modules/${moduleId}/lessons`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateLesson(lessonId: string, data: Partial<CreateLessonData>): Promise<CourseLesson> {
  return apiFetch(`/studio/courses/lessons/${lessonId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteLesson(lessonId: string): Promise<void> {
  await apiFetch(`/studio/courses/lessons/${lessonId}`, { method: 'DELETE' });
}

// ── Enrollments ────────────────────────────────────────────
export async function fetchEnrollments(courseId: string) {
  return apiFetch<{ data: Enrollment[]; total: number }>(
    `/studio/courses/${courseId}/enrollments`,
  );
}

// ── Face2Face ──────────────────────────────────────────────
export async function fetchF2FPricings(): Promise<F2FPricing[]> {
  return apiFetch('/studio/f2f/pricing');
}

export async function fetchF2FSlots(options?: { from_date?: string; to_date?: string; status?: string }): Promise<F2FSlot[]> {
  const params = new URLSearchParams();
  if (options?.from_date) params.set('from_date', options.from_date);
  if (options?.to_date) params.set('to_date', options.to_date);
  if (options?.status) params.set('status', options.status);
  const qs = params.toString();
  return apiFetch(`/studio/f2f/slots${qs ? `?${qs}` : ''}`);
}

export async function fetchF2FBookings(options?: { status?: string; page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  const qs = params.toString();
  return apiFetch<{ data: F2FBooking[]; total: number; hasMore: boolean }>(
    `/studio/f2f/bookings${qs ? `?${qs}` : ''}`,
  );
}

export async function updateBookingStatus(id: string, status: string): Promise<F2FBooking> {
  return apiFetch(`/studio/f2f/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

// ── Bewertungen ────────────────────────────────────────────
export async function fetchReviews(options?: { page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  const qs = params.toString();
  return apiFetch<{ data: Review[]; total: number; hasMore: boolean }>(
    `/studio/reviews${qs ? `?${qs}` : ''}`,
  );
}

// ── Ankuendigungen ─────────────────────────────────────────
export async function fetchAnnouncements(options?: { page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  const qs = params.toString();
  return apiFetch<{ data: Announcement[]; total: number; hasMore: boolean }>(
    `/studio/announcements${qs ? `?${qs}` : ''}`,
  );
}

export async function createAnnouncement(data: CreateAnnouncementData): Promise<Announcement> {
  return apiFetch('/studio/announcements', { method: 'POST', body: JSON.stringify(data) });
}

// ── Mediathek ─────────────────────────────────────────────
export async function fetchMediaItems(options?: { content_type?: string; tags?: string[]; page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (options?.content_type) params.set('content_type', options.content_type);
  if (options?.tags?.length) params.set('tags', options.tags.join(','));
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  const qs = params.toString();
  return apiFetch<{ data: MediaItem[]; total: number; hasMore: boolean }>(`/studio/media${qs ? `?${qs}` : ''}`);
}

export async function fetchMediaItem(id: string): Promise<MediaItem> {
  return apiFetch(`/studio/media/${id}`);
}

export async function createMediaItem(data: CreateMediaData): Promise<MediaItem> {
  return apiFetch('/studio/media', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateMediaItem(id: string, data: UpdateMediaData): Promise<MediaItem> {
  return apiFetch(`/studio/media/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteMediaItem(id: string): Promise<void> {
  await apiFetch(`/studio/media/${id}`, { method: 'DELETE' });
}

// ── F2F Write-Ops ─────────────────────────────────────────
export async function createF2FPricing(data: CreateF2FPricingData): Promise<F2FPricing> {
  return apiFetch('/studio/f2f/pricing', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteF2FPricing(id: string): Promise<void> {
  await apiFetch(`/studio/f2f/pricing/${id}`, { method: 'DELETE' });
}

export async function createF2FSlot(data: CreateF2FSlotData): Promise<F2FSlot> {
  return apiFetch('/studio/f2f/slots', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteF2FSlot(id: string): Promise<void> {
  await apiFetch(`/studio/f2f/slots/${id}`, { method: 'DELETE' });
}

// ── Finanzen ──────────────────────────────────────────────
export async function fetchFinanceOverview(): Promise<FinanceOverview> {
  return apiFetch('/studio/finance/overview');
}

export async function fetchPayouts(options?: { page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  const qs = params.toString();
  return apiFetch<{ data: MentorPayout[]; total: number; hasMore: boolean }>(`/studio/finance/payouts${qs ? `?${qs}` : ''}`);
}

export async function fetchCoupons(): Promise<Coupon[]> {
  return apiFetch('/studio/finance/coupons');
}

export async function createCoupon(data: CreateCouponData): Promise<Coupon> {
  return apiFetch('/studio/finance/coupons', { method: 'POST', body: JSON.stringify(data) });
}

export async function toggleCoupon(id: string): Promise<Coupon> {
  return apiFetch(`/studio/finance/coupons/${id}/toggle`, { method: 'PATCH' });
}

export async function deleteCoupon(id: string): Promise<void> {
  await apiFetch(`/studio/finance/coupons/${id}`, { method: 'DELETE' });
}

// ── Review-Reply ──────────────────────────────────────────
export async function replyToReview(id: string, replyText: string): Promise<Review> {
  return apiFetch(`/studio/reviews/${id}/reply`, { method: 'PATCH', body: JSON.stringify({ reply_text: replyText }) });
}

// ── Mentor-Profil ─────────────────────────────────────────
export async function fetchMentorProfile(): Promise<MentorProfile> {
  return apiFetch('/studio/profile');
}

export async function updateMentorProfile(data: UpdateMentorProfileData): Promise<MentorProfile> {
  return apiFetch('/studio/profile', { method: 'PATCH', body: JSON.stringify(data) });
}
