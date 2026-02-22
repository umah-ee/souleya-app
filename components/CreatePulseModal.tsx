import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { createPulse } from '../lib/pulse';
import type { Pulse } from '../types/pulse';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (pulse: Pulse) => void;
}

export default function CreatePulseModal({ visible, onClose, onCreated }: Props) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const maxLen = 1000;

  const handleSubmit = async () => {
    if (!content.trim() || loading) return;
    setLoading(true);
    try {
      const pulse = await createPulse(content.trim());
      setContent('');
      onCreated(pulse);
      onClose();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>NEUER PULSE</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>×</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            value={content}
            onChangeText={setContent}
            placeholder="Teile einen Gedanken, eine Erfahrung …"
            placeholderTextColor="#5A5450"
            multiline
            maxLength={maxLen}
            autoFocus
          />

          <View style={styles.footer}>
            <Text style={styles.counter}>{content.length} / {maxLen}</Text>
            <TouchableOpacity
              style={[styles.submitBtn, (!content.trim() || loading) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!content.trim() || loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#2C2A35" size="small" />
                : <Text style={styles.submitText}>TEILEN</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#2C2A35',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    minHeight: 300,
    borderTopWidth: 1,
    borderColor: 'rgba(200,169,110,0.15)',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(200,169,110,0.2)',
    alignSelf: 'center', marginBottom: 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  title: { fontSize: 10, letterSpacing: 4, color: '#A8894E' },
  closeBtn: { color: '#5A5450', fontSize: 22 },
  input: {
    color: '#F0EDE8', fontSize: 15, lineHeight: 24,
    fontWeight: '300', minHeight: 120,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 16,
    paddingTop: 12, borderTopWidth: 1,
    borderTopColor: 'rgba(200,169,110,0.08)',
  },
  counter: { fontSize: 10, color: '#5A5450', letterSpacing: 1 },
  submitBtn: {
    paddingVertical: 10, paddingHorizontal: 24,
    backgroundColor: '#C8A96E', borderRadius: 99,
  },
  submitBtnDisabled: { backgroundColor: 'rgba(200,169,110,0.25)' },
  submitText: { fontSize: 10, letterSpacing: 3, color: '#2C2A35', fontWeight: '600' },
});
