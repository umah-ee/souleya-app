import { apiFetch } from './api';
import type {
  Course, CourseModule, CourseLesson, Enrollment,
  F2FPricing, F2FSlot, F2FBooking,
  Review, Announcement, StudioDashboardKPIs,
  CreateAnnouncementData, UpdateCourseData,
  CreateCourseData, CreateModuleData, CreateLessonData,
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
