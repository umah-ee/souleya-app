import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Switch,
  Modal, Pressable, ScrollView, ActivityIndicator, StyleSheet,
} from 'react-native';
import type { Message } from '../../types/chat';
import { createPoll } from '../../lib/chat';
import { Icon } from '../Icon';

interface Props {
  visible: boolean;
  channelId: string;
  onCreated: (msg: Message) => void;
  onClose: () => void;
}

export default function CreatePollModal({ visible, channelId, onCreated, onClose }: Props) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [sending, setSending] = useState(false);

  const addOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    setOptions(options.map((o, i) => (i === index ? value : o)));
  };

  const canSubmit = question.trim() && options.filter((o) => o.trim()).length >= 2 && !sending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSending(true);
    try {
      const msg = await createPoll(channelId, {
        question: question.trim(),
        options: options.filter((o) => o.trim()),
        multiple_choice: multipleChoice,
      });
      // Reset
      setQuestion('');
      setOptions(['', '']);
      setMultipleChoice(false);
      onCreated(msg);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setQuestion('');
    setOptions(['', '']);
    setMultipleChoice(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Abstimmung erstellen</Text>
            <TouchableOpacity onPress={handleClose}>
              <Icon name="x" size={20} color="#5A5450" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* Frage */}
            <TextInput
              style={styles.input}
              value={question}
              onChangeText={setQuestion}
              placeholder="Frage stellen ..."
              placeholderTextColor="#5A5450"
              maxLength={500}
              autoFocus
            />

            {/* Optionen */}
            {options.map((opt, i) => (
              <View key={i} style={styles.optionRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={opt}
                  onChangeText={(v) => updateOption(i, v)}
                  placeholder={`Option ${i + 1}`}
                  placeholderTextColor="#5A5450"
                  maxLength={200}
                />
                {options.length > 2 && (
                  <TouchableOpacity onPress={() => removeOption(i)} style={{ padding: 8 }}>
                    <Icon name="x" size={14} color="#5A5450" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Option hinzufuegen */}
            {options.length < 10 && (
              <TouchableOpacity
                onPress={addOption}
                style={styles.addOptionBtn}
                activeOpacity={0.7}
              >
                <Icon name="plus" size={12} color="#C8A96E" />
                <Text style={styles.addOptionText}>Option hinzufuegen</Text>
              </TouchableOpacity>
            )}

            {/* Mehrfachauswahl */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Mehrfachauswahl erlauben</Text>
              <Switch
                value={multipleChoice}
                onValueChange={setMultipleChoice}
                trackColor={{ false: 'rgba(255,255,255,0.08)', true: 'rgba(200,169,110,0.3)' }}
                thumbColor={multipleChoice ? '#C8A96E' : '#5A5450'}
              />
            </View>
          </ScrollView>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Abbrechen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.7}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#1A1A1A" />
              ) : (
                <Text style={[styles.submitBtnText, !canSubmit && { color: '#5A5450' }]}>
                  Abstimmung starten
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#1E1C26',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200,169,110,0.06)',
  },
  headerTitle: {
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#C8A96E',
    fontWeight: '500',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.1)',
    borderRadius: 8,
    color: '#F0EDE8',
    fontSize: 14,
    marginBottom: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  addOptionText: {
    fontSize: 12,
    color: '#C8A96E',
    letterSpacing: 0.5,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 12,
    color: '#5A5450',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.15)',
  },
  cancelBtnText: {
    fontSize: 12,
    color: '#5A5450',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: '#C8A96E',
  },
  submitBtnDisabled: {
    backgroundColor: 'rgba(200,169,110,0.2)',
  },
  submitBtnText: {
    fontSize: 12,
    color: '#1A1A1A',
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
