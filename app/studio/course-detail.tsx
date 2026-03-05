import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Image, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeStore } from '../../store/theme';
import { Icon, type IconName } from '../../components/Icon';
import {
  fetchCourse, updateCourse, deleteCourse,
  fetchModules, createModule, updateModule, deleteModule,
  createLesson, updateLesson, deleteLesson,
} from '../../lib/studio';
import type {
  Course, CourseModule, CourseLesson, UpdateCourseData,
  CourseCategory, CourseStatus,
} from '../../types/studio';

// ── Konstanten ─────────────────────────────────────────────
type Tab = 'overview' | 'curriculum' | 'settings';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Entwurf',
  active: 'Aktiv',
  archived: 'Archiviert',
  sold_out: 'Ausverkauft',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#9A9080',
  active: '#22863a',
  archived: '#777',
  sold_out: '#A85454',
};

const CATEGORY_LABELS: Record<string, string> = {
  online: 'Online',
  offline: 'Vor Ort',
  recurring: 'Wiederkehrend',
  live: 'Live',
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  video: 'Video',
  audio: 'Audio',
  text: 'Text',
  pdf: 'PDF',
  live: 'Live',
  quiz: 'Quiz',
};

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useThemeStore((s) => s.colors);

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Settings Form
  const [form, setForm] = useState<UpdateCourseData>({});

  // Curriculum Edit State
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [addingModuleTitle, setAddingModuleTitle] = useState('');
  const [addingLessonToModule, setAddingLessonToModule] = useState<string | null>(null);
  const [addingLessonTitle, setAddingLessonTitle] = useState('');

  // ── Laden ────────────────────────────────────────────────
  const loadCourse = useCallback(async () => {
    if (!id) return;
    try {
      const [c, m] = await Promise.all([
        fetchCourse(id),
        fetchModules(id),
      ]);
      setCourse(c);
      setModules(m);
      setForm({
        title: c.title,
        description: c.description ?? '',
        category: c.category,
        price_cents: c.price_cents,
        max_participants: c.max_participants ?? undefined,
        location_name: c.location_name ?? '',
        location_address: c.location_address ?? '',
        starts_at: c.starts_at ?? '',
        ends_at: c.ends_at ?? '',
        drip_interval: c.drip_interval ?? '',
      });
      setExpandedModules(new Set(m.map((mod) => mod.id)));
    } catch {
      setError('Kurs konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadCourse(); }, [loadCourse]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCourse();
    setRefreshing(false);
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  // ── Settings ─────────────────────────────────────────────
  const handleSaveSettings = async () => {
    if (!course) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateCourse(course.id, form);
      setCourse(updated);
      showSuccess('Einstellungen gespeichert');
    } catch {
      setError('Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: CourseStatus) => {
    if (!course) return;
    try {
      const updated = await updateCourse(course.id, { status });
      setCourse(updated);
      showSuccess(`Status: ${STATUS_LABELS[status]}`);
    } catch {
      setError('Status-Aenderung fehlgeschlagen');
    }
  };

  const handleDeleteCourse = () => {
    Alert.alert(
      'Kurs loeschen',
      'Kurs wirklich loeschen? Dies kann nicht rueckgaengig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Loeschen',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCourse(id!);
              router.back();
            } catch {
              setError('Loeschen fehlgeschlagen');
            }
          },
        },
      ],
    );
  };

  // ── Curriculum: Modules ──────────────────────────────────
  const toggleModule = (modId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      next.has(modId) ? next.delete(modId) : next.add(modId);
      return next;
    });
  };

  const handleAddModule = async () => {
    if (!addingModuleTitle.trim() || !id) return;
    try {
      const mod = await createModule(id, { title: addingModuleTitle.trim() });
      setModules((prev) => [...prev, mod]);
      setAddingModuleTitle('');
      setExpandedModules((prev) => new Set([...prev, mod.id]));
      showSuccess('Modul hinzugefuegt');
    } catch {
      setError('Modul erstellen fehlgeschlagen');
    }
  };

  const handleSaveModuleTitle = async (moduleId: string) => {
    if (!editValue.trim()) return;
    try {
      const updated = await updateModule(moduleId, { title: editValue.trim() });
      setModules((prev) => prev.map((m) => m.id === moduleId ? { ...m, ...updated } : m));
      setEditingModuleId(null);
      setEditValue('');
    } catch {
      setError('Modul aktualisieren fehlgeschlagen');
    }
  };

  const handleDeleteModule = (moduleId: string) => {
    Alert.alert('Modul loeschen', 'Modul mit allen Lektionen loeschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Loeschen',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteModule(moduleId);
            setModules((prev) => prev.filter((m) => m.id !== moduleId));
            showSuccess('Modul geloescht');
          } catch {
            setError('Modul loeschen fehlgeschlagen');
          }
        },
      },
    ]);
  };

  // ── Curriculum: Lessons ──────────────────────────────────
  const handleAddLesson = async (moduleId: string) => {
    if (!addingLessonTitle.trim()) return;
    try {
      const lesson = await createLesson(moduleId, {
        title: addingLessonTitle.trim(),
        content_type: 'text',
      });
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: [...(m.lessons ?? []), lesson] }
            : m,
        ),
      );
      setAddingLessonToModule(null);
      setAddingLessonTitle('');
      showSuccess('Lektion hinzugefuegt');
    } catch {
      setError('Lektion erstellen fehlgeschlagen');
    }
  };

  const handleSaveLessonTitle = async (lessonId: string, moduleId: string) => {
    if (!editValue.trim()) return;
    try {
      const updated = await updateLesson(lessonId, { title: editValue.trim() });
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: (m.lessons ?? []).map((l) => l.id === lessonId ? { ...l, ...updated } : l) }
            : m,
        ),
      );
      setEditingLessonId(null);
      setEditValue('');
    } catch {
      setError('Lektion aktualisieren fehlgeschlagen');
    }
  };

  const handleDeleteLesson = (lessonId: string, moduleId: string) => {
    Alert.alert('Lektion loeschen', 'Lektion wirklich loeschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Loeschen',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLesson(lessonId);
            setModules((prev) =>
              prev.map((m) =>
                m.id === moduleId
                  ? { ...m, lessons: (m.lessons ?? []).filter((l) => l.id !== lessonId) }
                  : m,
              ),
            );
            showSuccess('Lektion geloescht');
          } catch {
            setError('Lektion loeschen fehlgeschlagen');
          }
        },
      },
    ]);
  };

  const handleTogglePreview = async (lessonId: string, moduleId: string, current: boolean) => {
    try {
      await updateLesson(lessonId, { is_preview: !current });
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: (m.lessons ?? []).map((l) => l.id === lessonId ? { ...l, is_preview: !current } : l) }
            : m,
        ),
      );
    } catch {}
  };

  // ── Render ────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSolid }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (!course) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSolid }]}>
        <Icon name="book" size={32} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Kurs nicht gefunden.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: colors.goldBorderS }]}
          activeOpacity={0.7}
        >
          <Text style={{ color: colors.goldText, fontSize: 10, letterSpacing: 2 }}>ZURUECK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalLessons = modules.reduce((sum, m) => sum + (m.lessons?.length ?? 0), 0);
  const statusColor = STATUS_COLORS[course.status] ?? colors.textMuted;

  const TABS: { key: Tab; label: string; icon: IconName }[] = [
    { key: 'overview', label: 'Uebersicht', icon: 'info' },
    { key: 'curriculum', label: 'Curriculum', icon: 'book' },
    { key: 'settings', label: 'Einstellungen', icon: 'edit' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSolid }]}>
      {/* Messages */}
      {success !== '' && (
        <View style={[styles.messageBanner, { backgroundColor: '#22863a18', borderColor: '#22863a33' }]}>
          <Text style={{ color: '#22863a', fontSize: 13, textAlign: 'center' }}>{success}</Text>
        </View>
      )}
      {error !== '' && (
        <View style={[styles.messageBanner, { backgroundColor: '#A8545418', borderColor: '#A8545433' }]}>
          <Text style={{ color: '#A85454', fontSize: 13, textAlign: 'center' }}>{error}</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textH }]} numberOfLines={2}>
              {course.title}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {(STATUS_LABELS[course.status] ?? course.status).toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Text style={{ fontSize: 12, color: colors.textSec }}>
              {CATEGORY_LABELS[course.category] ?? course.category}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>
              {course.participants_count} Teilnehmer
            </Text>
            {course.rating_avg > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Icon name="star" size={12} color={colors.gold} />
                <Text style={{ fontSize: 12, color: colors.goldText }}>
                  {course.rating_avg.toFixed(1)}
                </Text>
              </View>
            )}
            {course.price_cents > 0 && (
              <Text style={{ fontSize: 12, color: colors.goldText, fontWeight: '500' }}>
                {(course.price_cents / 100).toFixed(0)} {course.currency}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabRow, { borderBottomColor: colors.dividerL }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabBtn,
              activeTab === tab.key && { borderBottomColor: colors.gold, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Icon name={tab.icon} size={14} color={activeTab === tab.key ? colors.goldText : colors.textMuted} />
            <Text style={{
              fontSize: 11,
              color: activeTab === tab.key ? colors.goldText : colors.textMuted,
              letterSpacing: 0.5,
            }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        {/* ── Tab: Uebersicht ──────────────────────────────── */}
        {activeTab === 'overview' && (
          <>
            {/* Cover */}
            {course.cover_url && (
              <View style={styles.coverWrap}>
                <Image source={{ uri: course.cover_url }} style={styles.coverImg} />
              </View>
            )}

            {/* Beschreibung */}
            <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              <Text style={[styles.cardLabel, { color: colors.textMuted }]}>BESCHREIBUNG</Text>
              <Text style={{ fontSize: 14, lineHeight: 22, color: colors.textSec }}>
                {course.description || 'Keine Beschreibung vorhanden.'}
              </Text>
            </View>

            {/* Details */}
            {(course.location_name || course.starts_at) && (
              <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                <Text style={[styles.cardLabel, { color: colors.textMuted }]}>DETAILS</Text>
                {course.location_name && (
                  <View style={styles.detailRow}>
                    <Icon name="map-pin" size={14} color={colors.gold} />
                    <Text style={{ fontSize: 13, color: colors.textSec, flex: 1 }}>
                      {course.location_name}{course.location_address ? ` – ${course.location_address}` : ''}
                    </Text>
                  </View>
                )}
                {course.starts_at && (
                  <View style={styles.detailRow}>
                    <Icon name="calendar-event" size={14} color={colors.gold} />
                    <Text style={{ fontSize: 13, color: colors.textSec, flex: 1 }}>
                      {new Date(course.starts_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {course.ends_at ? ` – ${new Date(course.ends_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Quick Stats */}
            <View style={styles.statsGrid}>
              {[
                { label: 'MODULE', value: String(modules.length), icon: 'book' as IconName },
                { label: 'LEKTIONEN', value: String(totalLessons), icon: 'edit' as IconName },
                { label: 'TEILNEHMER', value: String(course.participants_count), icon: 'users' as IconName },
                { label: 'BEWERTUNG', value: course.rating_avg > 0 ? course.rating_avg.toFixed(1) : '–', icon: 'star' as IconName },
              ].map((stat) => (
                <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                  <Icon name={stat.icon} size={18} color={colors.gold} />
                  <Text style={[styles.statValue, { color: colors.textH }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Tab: Curriculum ──────────────────────────────── */}
        {activeTab === 'curriculum' && (
          <>
            {/* Info */}
            <View style={styles.curriculumInfo}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                {modules.length} Module, {totalLessons} Lektionen
              </Text>
            </View>

            {modules.length === 0 && (
              <View style={[styles.card, styles.emptyCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                <Icon name="book" size={32} color={colors.textMuted} />
                <Text style={{ fontSize: 14, color: colors.textSec, marginTop: 8 }}>
                  Noch keine Module. Erstelle dein erstes Modul.
                </Text>
              </View>
            )}

            {modules.map((mod, mi) => (
              <View key={mod.id} style={[styles.moduleCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                {/* Module Header */}
                <TouchableOpacity
                  style={[
                    styles.moduleHeader,
                    expandedModules.has(mod.id) && { borderBottomWidth: 1, borderBottomColor: colors.dividerL },
                  ]}
                  onPress={() => toggleModule(mod.id)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600', minWidth: 24 }}>
                    {mi + 1}.
                  </Text>

                  {editingModuleId === mod.id ? (
                    <TextInput
                      autoFocus
                      value={editValue}
                      onChangeText={setEditValue}
                      onBlur={() => handleSaveModuleTitle(mod.id)}
                      onSubmitEditing={() => handleSaveModuleTitle(mod.id)}
                      style={[styles.inlineInput, {
                        color: colors.textH,
                        backgroundColor: colors.glass,
                        borderColor: colors.goldBorderS,
                      }]}
                    />
                  ) : (
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: colors.textH }} numberOfLines={1}>
                      {mod.title}
                    </Text>
                  )}

                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    {mod.lessons?.length ?? 0}
                  </Text>

                  <TouchableOpacity
                    onPress={() => { setEditingModuleId(mod.id); setEditValue(mod.title); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="pencil" size={12} color={colors.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteModule(mod.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="trash" size={12} color="#A85454" />
                  </TouchableOpacity>

                  <View style={{ transform: [{ rotate: expandedModules.has(mod.id) ? '90deg' : '0deg' }] }}>
                    <Icon name="chevron-right" size={14} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>

                {/* Lessons */}
                {expandedModules.has(mod.id) && (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                    {(mod.lessons ?? []).map((lesson, li) => (
                      <View
                        key={lesson.id}
                        style={[
                          styles.lessonRow,
                          li < (mod.lessons?.length ?? 0) - 1 && { borderBottomWidth: 1, borderBottomColor: colors.dividerL },
                        ]}
                      >
                        <Text style={{ fontSize: 10, color: colors.textMuted, minWidth: 32 }}>
                          {mi + 1}.{li + 1}
                        </Text>

                        {editingLessonId === lesson.id ? (
                          <TextInput
                            autoFocus
                            value={editValue}
                            onChangeText={setEditValue}
                            onBlur={() => handleSaveLessonTitle(lesson.id, mod.id)}
                            onSubmitEditing={() => handleSaveLessonTitle(lesson.id, mod.id)}
                            style={[styles.inlineInput, {
                              color: colors.textH,
                              backgroundColor: colors.glass,
                              borderColor: colors.goldBorderS,
                            }]}
                          />
                        ) : (
                          <Text style={{ flex: 1, fontSize: 13, color: colors.textSec }} numberOfLines={1}>
                            {lesson.title}
                          </Text>
                        )}

                        {/* Content Type Badge */}
                        <View style={[styles.typeBadge, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                          <Text style={{ fontSize: 7, letterSpacing: 1, color: colors.textMuted }}>
                            {(CONTENT_TYPE_LABELS[lesson.content_type] ?? lesson.content_type).toUpperCase()}
                          </Text>
                        </View>

                        {/* Duration */}
                        {lesson.duration_seconds != null && lesson.duration_seconds > 0 && (
                          <Text style={{ fontSize: 11, color: colors.textMuted }}>
                            {Math.floor(lesson.duration_seconds / 60)}:{String(lesson.duration_seconds % 60).padStart(2, '0')}
                          </Text>
                        )}

                        {/* Preview Toggle */}
                        <TouchableOpacity
                          onPress={() => handleTogglePreview(lesson.id, mod.id, lesson.is_preview)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Icon
                            name={lesson.is_preview ? 'star-filled' : 'star'}
                            size={12}
                            color={lesson.is_preview ? colors.gold : colors.textMuted}
                          />
                        </TouchableOpacity>

                        {/* Edit */}
                        <TouchableOpacity
                          onPress={() => { setEditingLessonId(lesson.id); setEditValue(lesson.title); }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Icon name="pencil" size={11} color={colors.textMuted} />
                        </TouchableOpacity>

                        {/* Delete */}
                        <TouchableOpacity
                          onPress={() => handleDeleteLesson(lesson.id, mod.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Icon name="trash" size={11} color="#A85454" />
                        </TouchableOpacity>
                      </View>
                    ))}

                    {/* Add Lesson */}
                    {addingLessonToModule === mod.id ? (
                      <View style={styles.addRow}>
                        <TextInput
                          autoFocus
                          value={addingLessonTitle}
                          onChangeText={setAddingLessonTitle}
                          onSubmitEditing={() => handleAddLesson(mod.id)}
                          placeholder="Lektion-Titel ..."
                          placeholderTextColor={colors.textMuted}
                          style={[styles.addInput, {
                            color: colors.textH,
                            backgroundColor: colors.glass,
                            borderColor: colors.goldBorderS,
                          }]}
                        />
                        <TouchableOpacity
                          onPress={() => handleAddLesson(mod.id)}
                          style={[styles.addConfirmBtn, { backgroundColor: colors.goldBg }]}
                          activeOpacity={0.7}
                        >
                          <Text style={{ color: colors.goldText, fontSize: 10, letterSpacing: 1 }}>OK</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => { setAddingLessonToModule(null); setAddingLessonTitle(''); }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Icon name="x" size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addLessonBtn}
                        onPress={() => { setAddingLessonToModule(mod.id); setAddingLessonTitle(''); }}
                        activeOpacity={0.7}
                      >
                        <Icon name="plus" size={12} color={colors.goldText} />
                        <Text style={{ fontSize: 11, color: colors.goldText, letterSpacing: 0.5 }}>
                          Lektion hinzufuegen
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}

            {/* Add Module */}
            <View style={styles.addModuleRow}>
              <TextInput
                value={addingModuleTitle}
                onChangeText={setAddingModuleTitle}
                onSubmitEditing={handleAddModule}
                placeholder="Neues Modul ..."
                placeholderTextColor={colors.textMuted}
                style={[styles.addModuleInput, {
                  color: colors.textH,
                  backgroundColor: colors.glass,
                  borderColor: colors.goldBorderS,
                }]}
              />
              <TouchableOpacity
                onPress={handleAddModule}
                disabled={!addingModuleTitle.trim()}
                style={[styles.addModuleBtn, {
                  backgroundColor: addingModuleTitle.trim() ? colors.goldDeep : colors.glass,
                }]}
                activeOpacity={0.7}
              >
                <Text style={{
                  color: addingModuleTitle.trim() ? '#fff' : colors.textMuted,
                  fontSize: 9,
                  letterSpacing: 2,
                }}>
                  + MODUL
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Tab: Einstellungen ───────────────────────────── */}
        {activeTab === 'settings' && (
          <>
            {/* Status */}
            <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              <Text style={[styles.cardLabel, { color: colors.textMuted }]}>STATUS</Text>
              <View style={styles.statusRow}>
                {(['draft', 'active', 'archived'] as CourseStatus[]).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusOption,
                      {
                        backgroundColor: course.status === s ? colors.goldBg : 'transparent',
                        borderColor: course.status === s ? colors.goldBorderS : colors.divider,
                      },
                    ]}
                    onPress={() => handleStatusChange(s)}
                    activeOpacity={0.7}
                  >
                    <Text style={{
                      fontSize: 9,
                      letterSpacing: 1.5,
                      color: course.status === s ? colors.goldText : colors.textMuted,
                    }}>
                      {(STATUS_LABELS[s] ?? s).toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Grunddaten */}
            <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              <Text style={[styles.cardLabel, { color: colors.textMuted }]}>GRUNDDATEN</Text>

              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>TITEL</Text>
              <TextInput
                value={form.title ?? ''}
                onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
                style={[styles.input, { color: colors.textH, backgroundColor: colors.glass, borderColor: colors.goldBorderS }]}
              />

              <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 12 }]}>BESCHREIBUNG</Text>
              <TextInput
                value={form.description ?? ''}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={[styles.input, styles.textArea, { color: colors.textH, backgroundColor: colors.glass, borderColor: colors.goldBorderS }]}
              />

              <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 12 }]}>KATEGORIE</Text>
              <View style={styles.categoryRow}>
                {(['online', 'offline', 'recurring', 'live'] as CourseCategory[]).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryOption,
                      {
                        backgroundColor: form.category === cat ? colors.goldDeep : 'transparent',
                        borderColor: form.category === cat ? colors.goldDeep : colors.divider,
                      },
                    ]}
                    onPress={() => setForm((f) => ({ ...f, category: cat }))}
                    activeOpacity={0.7}
                  >
                    <Text style={{
                      fontSize: 9,
                      letterSpacing: 1,
                      color: form.category === cat ? '#fff' : colors.textMuted,
                    }}>
                      {CATEGORY_LABELS[cat].toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Preis & Teilnehmer */}
            <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              <Text style={[styles.cardLabel, { color: colors.textMuted }]}>PREIS & TEILNEHMER</Text>

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>PREIS (CENT)</Text>
                  <TextInput
                    value={String(form.price_cents ?? 0)}
                    onChangeText={(v) => setForm((f) => ({ ...f, price_cents: parseInt(v) || 0 }))}
                    keyboardType="numeric"
                    style={[styles.input, { color: colors.textH, backgroundColor: colors.glass, borderColor: colors.goldBorderS }]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>MAX. TEILNEHMER</Text>
                  <TextInput
                    value={form.max_participants ? String(form.max_participants) : ''}
                    onChangeText={(v) => setForm((f) => ({ ...f, max_participants: parseInt(v) || undefined }))}
                    keyboardType="numeric"
                    placeholder="Unbegrenzt"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { color: colors.textH, backgroundColor: colors.glass, borderColor: colors.goldBorderS }]}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 12 }]}>DRIP INTERVAL</Text>
              <TextInput
                value={form.drip_interval ?? ''}
                onChangeText={(v) => setForm((f) => ({ ...f, drip_interval: v }))}
                placeholder="z.B. 7 days"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { color: colors.textH, backgroundColor: colors.glass, borderColor: colors.goldBorderS }]}
              />
            </View>

            {/* Ort */}
            <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              <Text style={[styles.cardLabel, { color: colors.textMuted }]}>ORT & DATUM</Text>

              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>ORT</Text>
              <TextInput
                value={form.location_name ?? ''}
                onChangeText={(v) => setForm((f) => ({ ...f, location_name: v }))}
                placeholder="Kein Ort"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { color: colors.textH, backgroundColor: colors.glass, borderColor: colors.goldBorderS }]}
              />

              <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 12 }]}>ADRESSE</Text>
              <TextInput
                value={form.location_address ?? ''}
                onChangeText={(v) => setForm((f) => ({ ...f, location_address: v }))}
                placeholder="Keine Adresse"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { color: colors.textH, backgroundColor: colors.glass, borderColor: colors.goldBorderS }]}
              />

              <View style={[styles.twoCol, { marginTop: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>START</Text>
                  <TextInput
                    value={form.starts_at ? new Date(form.starts_at).toLocaleDateString('de-DE') : ''}
                    onChangeText={(v) => setForm((f) => ({ ...f, starts_at: v }))}
                    placeholder="TT.MM.JJJJ"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { color: colors.textH, backgroundColor: colors.glass, borderColor: colors.goldBorderS }]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>ENDE</Text>
                  <TextInput
                    value={form.ends_at ? new Date(form.ends_at).toLocaleDateString('de-DE') : ''}
                    onChangeText={(v) => setForm((f) => ({ ...f, ends_at: v }))}
                    placeholder="TT.MM.JJJJ"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { color: colors.textH, backgroundColor: colors.glass, borderColor: colors.goldBorderS }]}
                  />
                </View>
              </View>
            </View>

            {/* Speichern + Loeschen */}
            <View style={styles.settingsActions}>
              <TouchableOpacity
                onPress={handleSaveSettings}
                disabled={saving}
                style={[styles.saveBtn, {
                  backgroundColor: saving ? colors.goldBg : colors.goldDeep,
                }]}
                activeOpacity={0.7}
              >
                <Text style={{
                  color: saving ? colors.textMuted : '#fff',
                  fontSize: 10,
                  letterSpacing: 2,
                }}>
                  {saving ? 'WIRD GESPEICHERT ...' : 'EINSTELLUNGEN SPEICHERN'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDeleteCourse}
                style={[styles.deleteBtn, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
                activeOpacity={0.7}
              >
                <Icon name="trash" size={16} color="#A85454" />
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14 },
  backBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },

  messageBanner: { marginHorizontal: 20, marginTop: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { fontSize: 18, fontWeight: '500', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 8, letterSpacing: 1.5, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },

  tabRow: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1 },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 10, paddingHorizontal: 14,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
    marginBottom: -1,
  },

  scrollContent: { padding: 20, gap: 12 },

  // Cards
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardLabel: { fontSize: 9, letterSpacing: 2.5, marginBottom: 10 },
  emptyCard: { alignItems: 'center', paddingVertical: 32 },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },

  // Stats Grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47%' as unknown as number, flexGrow: 1,
    borderRadius: 12, borderWidth: 1, padding: 14,
    alignItems: 'center', gap: 6,
  },
  statValue: { fontSize: 20, fontWeight: '500' },
  statLabel: { fontSize: 7, letterSpacing: 2 },

  // Cover
  coverWrap: { borderRadius: 16, overflow: 'hidden', height: 180 },
  coverImg: { width: '100%', height: '100%', resizeMode: 'cover' },

  // Curriculum
  curriculumInfo: { marginBottom: 4 },
  moduleCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  moduleHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
  },

  lessonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10,
  },

  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },

  inlineInput: {
    flex: 1, fontSize: 13, paddingVertical: 4, paddingHorizontal: 8,
    borderRadius: 8, borderWidth: 1,
  },

  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  addInput: {
    flex: 1, fontSize: 13, paddingVertical: 6, paddingHorizontal: 10,
    borderRadius: 8, borderWidth: 1,
  },
  addConfirmBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addLessonBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8,
  },

  addModuleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addModuleInput: {
    flex: 1, fontSize: 13, paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1,
  },
  addModuleBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },

  // Settings
  statusRow: { flexDirection: 'row', gap: 8 },
  statusOption: { flex: 1, paddingVertical: 8, borderRadius: 999, borderWidth: 1, alignItems: 'center' },

  fieldLabel: { fontSize: 8, letterSpacing: 2, marginBottom: 4 },
  input: {
    fontSize: 14, paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 8, borderWidth: 1,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  categoryRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  categoryOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },

  twoCol: { flexDirection: 'row', gap: 10 },

  settingsActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 999, alignItems: 'center' },
  deleteBtn: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
});
