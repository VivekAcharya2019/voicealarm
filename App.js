import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, Platform, StatusBar, Switch,
  KeyboardAvoidingView, ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';

// ─── Colors ────────────────────────────────────────────────────────────────
const C = {
  primary:   '#00E5FF',
  bg:        '#111111',
  card:      '#1E293B',
  textPri:   '#FFFFFF',
  textSec:   '#94A3B8',
  border:    '#374151',
  success:   '#10B981',
  error:     '#EF4444',
};

// ─── Constants ─────────────────────────────────────────────────────────────
const VOICES = [
  { id: 'calm-female',        name: 'Calm Female',        pitch: 1.2, rate: 0.80 },
  { id: 'clear-male',         name: 'Clear Male',         pitch: 0.8, rate: 0.90 },
  { id: 'natural-warm',       name: 'Natural Warm',       pitch: 1.0, rate: 0.85 },
  { id: 'deep-authoritative', name: 'Deep Authoritative', pitch: 0.6, rate: 0.70 },
  { id: 'fast-energetic',     name: 'Fast Energetic',     pitch: 1.1, rate: 1.30 },
];

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

const SNOOZE = [
  { label: '5m',  value: 5  },
  { label: '10m', value: 10 },
  { label: '15m', value: 15 },
  { label: '20m', value: 20 },
  { label: '30m', value: 30 },
];

const STORAGE_KEY = '@alarms_v1';

// ─── Helpers ───────────────────────────────────────────────────────────────
const pad = n => n < 10 ? '0' + n : '' + n;

function toDisplay(t) {
  if (!t) return '--:--';
  const [h, m] = t.split(':').map(Number);
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return pad(hr) + ':' + pad(m) + ' ' + (h < 12 ? 'AM' : 'PM');
}

function todayStr(date) {
  const d = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const mo = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return d[date.getDay()] + ', ' + mo[date.getMonth()] + ' ' + date.getDate();
}

function repeatLabel(alarm) {
  if (alarm.repeatMode === 'once')   return '🔔 Once';
  if (alarm.repeatMode === 'daily')  return '🔁 Daily';
  if (alarm.repeatMode === 'custom' && alarm.weekdays) {
    const sel = DAYS.filter(d => alarm.weekdays[d.key]).map(d => d.label);
    return '📅 ' + (sel.length ? sel.join(' · ') : 'No days');
  }
  return '';
}

function nowTimeStr() {
  const n = new Date();
  return pad(n.getHours()) + ':' + pad(n.getMinutes());
}

function todayKey() {
  return ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
}

function doSpeak(alarm) {
  const v = VOICES.find(x => x.id === alarm.voiceStyle) || VOICES[0];
  const msg = `It's ${toDisplay(alarm.time)}. Wake up! ${alarm.note || ''}`.trim();
  Speech.speak(msg, { pitch: v.pitch, rate: v.rate });
}

// ─── Time Picker ───────────────────────────────────────────────────────────
function TimePicker({ visible, value, onConfirm, onCancel }) {
  const init = value ? value.split(':').map(Number) : [7, 0];
  const [h, setH] = useState(init[0]);
  const [m, setM] = useState(init[1]);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const mins  = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={[s.sheet, { backgroundColor: C.card }]}>
          <Text style={[s.sheetTitle, { color: C.textPri }]}>Select Time</Text>
          <Text style={{ color: C.primary, fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 12,
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
            {toDisplay(pad(h) + ':' + pad(m))}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* Hours */}
            <View style={{ flex: 1 }}>
              <Text style={s.colLabel}>Hour</Text>
              <ScrollView style={s.pickerScroll} showsVerticalScrollIndicator={false}>
                {hours.map(hr => (
                  <TouchableOpacity key={hr} onPress={() => setH(hr)}
                    style={[s.pickerItem, h === hr && s.pickerItemOn]}>
                    <Text style={[s.pickerText, h === hr && s.pickerTextOn]}>{pad(hr)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <Text style={s.pickerSep}>:</Text>
            {/* Minutes */}
            <View style={{ flex: 1 }}>
              <Text style={s.colLabel}>Min</Text>
              <ScrollView style={s.pickerScroll} showsVerticalScrollIndicator={false}>
                {mins.map(mn => (
                  <TouchableOpacity key={mn} onPress={() => setM(mn)}
                    style={[s.pickerItem, m === mn && s.pickerItemOn]}>
                    <Text style={[s.pickerText, m === mn && s.pickerTextOn]}>{pad(mn)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <TouchableOpacity style={s.confirmBtn} onPress={() => onConfirm(pad(h) + ':' + pad(m))}>
            <Text style={s.confirmBtnText}>Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
            <Text style={{ color: C.textSec, fontSize: 15 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Add / Edit Alarm Modal ────────────────────────────────────────────────
function AddModal({ visible, onClose, onSave, editAlarm }) {
  const isEdit = !!editAlarm;

  const [time,        setTime]       = useState('07:00');
  const [note,        setNote]       = useState('');
  const [voice,       setVoice]      = useState('calm-female');
  const [repeat,      setRepeat]     = useState('once');
  const [weekdays,    setWeekdays]   = useState({});
  const [snooze,      setSnooze]     = useState(5);
  const [showTPicker, setShowTP]     = useState(false);
  const [showVDrop,   setShowVDrop]  = useState(false);

  // Pre-fill fields when editing
  useEffect(() => {
    if (editAlarm) {
      setTime(editAlarm.time || '07:00');
      setNote(editAlarm.note || '');
      setVoice(editAlarm.voiceStyle || 'calm-female');
      setRepeat(editAlarm.repeatMode || 'once');
      setWeekdays(editAlarm.weekdays || {});
      setSnooze(editAlarm.snoozeMins || 5);
    } else {
      setTime('07:00'); setNote(''); setVoice('calm-female');
      setRepeat('once'); setWeekdays({}); setSnooze(5);
    }
  }, [editAlarm, visible]);

  const toggleDay = k => setWeekdays(p => ({ ...p, [k]: !p[k] }));

  const save = () => {
    onSave({
      id: isEdit ? editAlarm.id : Date.now().toString(),
      time, note, voiceStyle: voice,
      repeatMode: repeat,
      weekdays: repeat === 'custom' ? weekdays : null,
      snoozeMins: snooze,
      isActive: isEdit ? editAlarm.isActive : true,
    });
    onClose();
  };

  const vName = (VOICES.find(v => v.id === voice) || VOICES[0]).name;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'center', marginHorizontal: 14 }}>
          <View style={[s.modalCard, { backgroundColor: C.card }]}>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Header */}
              <View style={s.mHeader}>
                <Text style={[s.mTitle, { color: C.textPri }]}>{isEdit ? 'Edit Alarm' : 'Add Alarm'}</Text>
                <TouchableOpacity onPress={onClose}>
                  <MaterialIcons name="close" size={24} color={C.textSec} />
                </TouchableOpacity>
              </View>

              {/* Time */}
              <Text style={s.label}>TIME</Text>
              <TouchableOpacity style={s.timePill} onPress={() => setShowTP(true)}>
                <Text style={{ color: C.primary, fontSize: 36, fontWeight: 'bold',
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                  {toDisplay(time)}
                </Text>
                <MaterialIcons name="access-time" size={22} color={C.primary} />
              </TouchableOpacity>

              {/* Note */}
              <Text style={s.label}>NOTE</Text>
              <TextInput style={[s.noteInput, { color: C.textPri, borderColor: C.border }]}
                placeholder="e.g. Morning pooja, Standup..." placeholderTextColor={C.textSec}
                value={note} onChangeText={setNote} multiline />

              {/* Voice */}
              <Text style={s.label}>VOICE STYLE</Text>
              <TouchableOpacity style={[s.dropBtn, { borderColor: C.border }]}
                onPress={() => setShowVDrop(v => !v)}>
                <Text style={{ color: C.textPri, flex: 1 }}>{vName}</Text>
                <MaterialIcons name={showVDrop ? 'expand-less' : 'expand-more'} size={22} color={C.textSec} />
              </TouchableOpacity>
              {showVDrop && (
                <View style={[s.dropMenu, { borderColor: C.border, backgroundColor: C.bg }]}>
                  {VOICES.map(v => (
                    <TouchableOpacity key={v.id} style={s.dropItem}
                      onPress={() => {
                        setVoice(v.id); setShowVDrop(false);
                      }}>
                      <Text style={{ color: voice === v.id ? C.primary : C.textPri }}>
                        {voice === v.id ? '✓  ' : '    '}{v.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Repeat */}
              <Text style={s.label}>REPEAT</Text>
              <View style={s.row}>
                {['once','daily','custom'].map(m => (
                  <TouchableOpacity key={m} onPress={() => setRepeat(m)}
                    style={[s.repeatBtn, { borderColor: repeat === m ? C.primary : C.border,
                      backgroundColor: repeat === m ? C.primary + '22' : 'transparent' }]}>
                    <Text style={{ color: repeat === m ? C.primary : C.textSec, fontWeight: '700', fontSize: 12 }}>
                      {m === 'once' ? '🔔 Once' : m === 'daily' ? '🔁 Daily' : '📅 Custom'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Weekdays */}
              {repeat === 'custom' && (
                <View style={[s.row, { marginTop: 10, justifyContent: 'space-between' }]}>
                  {DAYS.map(d => (
                    <TouchableOpacity key={d.key} onPress={() => toggleDay(d.key)}
                      style={[s.dayBtn, { backgroundColor: weekdays[d.key] ? C.primary : C.border }]}>
                      <Text style={{ color: weekdays[d.key] ? '#000' : C.textSec, fontSize: 10, fontWeight: '800' }}>
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Snooze */}
              <Text style={s.label}>SNOOZE DURATION</Text>
              <View style={[s.row, { flexWrap: 'wrap', gap: 6 }]}>
                {SNOOZE.map(o => (
                  <TouchableOpacity key={o.value} onPress={() => setSnooze(o.value)}
                    style={[s.snoozeBtn, { borderColor: snooze === o.value ? C.primary : C.border,
                      backgroundColor: snooze === o.value ? C.primary + '22' : 'transparent' }]}>
                    <Text style={{ color: snooze === o.value ? C.primary : C.textSec, fontWeight: '700', fontSize: 12 }}>
                      {o.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Actions */}
              <View style={[s.row, { marginTop: 24, gap: 12 }]}>
                <TouchableOpacity style={[s.actionBtn, { borderColor: C.border, borderWidth: 1 }]} onPress={onClose}>
                  <Text style={{ color: C.textSec, fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.primary }]} onPress={save}>
                  <Text style={{ color: '#000', fontWeight: '700' }}>{isEdit ? 'Update Alarm' : 'Save Alarm'}</Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>

      <TimePicker visible={showTPicker} value={time}
        onConfirm={t => { setTime(t); setShowTP(false); }}
        onCancel={() => setShowTP(false)} />
    </Modal>
  );
}

// ─── Firing Alarm Modal ────────────────────────────────────────────────────
function FiringModal({ visible, alarm, onDismiss, onSnooze }) {
  if (!alarm) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={[s.overlay, { backgroundColor: 'rgba(0,0,0,0.93)', justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Text style={{ color: C.primary, fontSize: 12, letterSpacing: 3, fontWeight: '800', marginBottom: 16 }}>
          ⏰  ALARM FIRING
        </Text>
        <Text style={{ color: C.primary, fontSize: 68, fontWeight: 'bold', marginBottom: 8,
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
          {toDisplay(alarm.time)}
        </Text>
        {alarm.note ? (
          <Text style={{ color: C.textPri, fontSize: 18, textAlign: 'center', marginBottom: 36, paddingHorizontal: 20 }}>
            {alarm.note}
          </Text>
        ) : <View style={{ marginBottom: 36 }} />}

        <Text style={{ color: C.textSec, fontSize: 11, letterSpacing: 2, marginBottom: 10 }}>SNOOZE FOR</Text>
        <View style={[s.row, { flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 28 }]}>
          {SNOOZE.map(o => (
            <TouchableOpacity key={o.value} onPress={() => onSnooze(o.value)}
              style={[s.snoozeBtn, { borderColor: C.primary, paddingHorizontal: 16, paddingVertical: 10 }]}>
              <Text style={{ color: C.primary, fontWeight: '700' }}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[s.dismissBtn]} onPress={onDismiss}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [alarms,      setAlarms]      = useState([]);
  const [now,         setNow]         = useState(new Date());
  const [showAdd,     setShowAdd]     = useState(false);
  const [editAlarm,   setEditAlarm]   = useState(null);
  const [firing,      setFiring]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const firedRef = useRef(new Set());

  // Load saved alarms
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => { if (raw) setAlarms(JSON.parse(raw)); })
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback(async list => {
    setAlarms(list);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }, []);

  // Clock + alarm checker every second
  useEffect(() => {
    const t = setInterval(() => {
      const n = new Date();
      setNow(n);
      if (n.getSeconds() !== 0) return;  // only check on the exact minute

      const tStr = nowTimeStr();
      const wDay = todayKey();

      setAlarms(cur => {
        cur.forEach(alarm => {
          if (!alarm.isActive) return;
          if (alarm.time !== tStr) return;
          const key = alarm.id + '_' + tStr;
          if (firedRef.current.has(key)) return;

          let fire = false;
          if (alarm.repeatMode === 'once' || alarm.repeatMode === 'daily') fire = true;
          if (alarm.repeatMode === 'custom' && alarm.weekdays?.[wDay]) fire = true;

          if (fire) {
            firedRef.current.add(key);
            setFiring(alarm);
            doSpeak(alarm);
          }
        });
        return cur;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const addAlarm = async data => {
    let updated;
    if (editAlarm) {
      updated = alarms.map(a => a.id === data.id ? data : a);
    } else {
      updated = [...alarms, data].sort((a, b) => a.time.localeCompare(b.time));
    }
    setEditAlarm(null);
    await persist(updated);
  };

  const deleteAlarm = id => {
    Alert.alert('Delete Alarm', 'Remove this alarm?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => persist(alarms.filter(a => a.id !== id)) },
    ]);
  };

  const toggleAlarm = (id, val) => persist(alarms.map(a => a.id === id ? { ...a, isActive: val } : a));

  const dismiss = async () => {
    Speech.stop();
    if (!firing) return;
    if (firing.repeatMode === 'once') await persist(alarms.filter(a => a.id !== firing.id));
    setFiring(null);
  };

  const snooze = async mins => {
    Speech.stop();
    if (!firing) return;
    const sn = new Date(Date.now() + mins * 60000);
    const nt = pad(sn.getHours()) + ':' + pad(sn.getMinutes());
    await persist(alarms.map(a => a.id === firing.id ? { ...a, time: nt } : a));
    setFiring(null);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <ScrollView contentContainerStyle={{ paddingTop: 56, paddingBottom: 100, paddingHorizontal: 20 }}>

        {/* ── Clock ── */}
        <View style={{ alignItems: 'center', paddingVertical: 24, marginBottom: 16 }}>
          <Text style={{ color: C.textSec, fontSize: 15, marginBottom: 6 }}>{todayStr(now)}</Text>
          <Text style={{ color: C.primary, fontSize: 52, fontWeight: 'bold',
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Text>
        </View>

        {/* ── Section header ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ color: C.textPri, fontSize: 20, fontWeight: 'bold' }}>Your Alarms</Text>
          <Text style={{ color: C.textSec, fontSize: 14 }}>{alarms.length} alarm{alarms.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* ── Empty state ── */}
        {alarms.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <MaterialIcons name="alarm-off" size={64} color={C.textSec} />
            <Text style={{ color: C.textSec, fontSize: 18, fontWeight: '600', marginTop: 16 }}>No alarms set</Text>
            <Text style={{ color: C.textSec, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
              Tap the + button to add your first alarm
            </Text>
          </View>
        )}

        {/* ── Alarm cards ── */}
        {alarms.map(alarm => (
          <View key={alarm.id} style={[s.card, { borderColor: alarm.isActive ? C.primary + '55' : C.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <Text style={{ color: alarm.isActive ? C.primary : C.textSec, fontSize: 30, fontWeight: 'bold',
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                    {toDisplay(alarm.time)}
                  </Text>
                  <Text style={{ color: alarm.isActive ? C.success : C.textSec, fontSize: 12, fontWeight: '700' }}>
                    {alarm.isActive ? '● ON' : '● OFF'}
                  </Text>
                </View>
                <Text style={{ color: C.textSec, fontSize: 13 }}>{repeatLabel(alarm)}</Text>
                {alarm.note ? <Text style={{ color: C.textSec, fontSize: 13, marginTop: 2 }}>{alarm.note}</Text> : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Switch value={alarm.isActive} onValueChange={v => toggleAlarm(alarm.id, v)}
                  trackColor={{ false: C.border, true: C.primary + '55' }}
                  thumbColor={alarm.isActive ? C.primary : C.textSec} />
                <TouchableOpacity onPress={() => { setEditAlarm(alarm); setShowAdd(true); }} style={{ padding: 8 }}>
                  <MaterialIcons name="edit" size={20} color={C.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteAlarm(alarm.id)} style={{ padding: 8 }}>
                  <MaterialIcons name="delete" size={20} color={C.error} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity style={s.fab} onPress={() => setShowAdd(true)}>
        <MaterialIcons name="add" size={32} color="#000" />
      </TouchableOpacity>

      <AddModal
        visible={showAdd}
        onClose={() => { setShowAdd(false); setEditAlarm(null); }}
        onSave={addAlarm}
        editAlarm={editAlarm}
      />
      <FiringModal visible={!!firing} alarm={firing} onDismiss={dismiss} onSnooze={snooze} />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay:       { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
  sheet:         { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetTitle:    { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  colLabel:      { color: '#94A3B8', fontSize: 11, textAlign: 'center', marginBottom: 4 },
  pickerScroll:  { maxHeight: 180 },
  pickerItem:    { paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  pickerItemOn:  { backgroundColor: '#00E5FF22' },
  pickerText:    { fontSize: 22, color: '#FFFFFF' },
  pickerTextOn:  { color: '#00E5FF', fontWeight: 'bold' },
  pickerSep:     { fontSize: 36, color: '#00E5FF', fontWeight: 'bold', alignSelf: 'center', marginTop: 28 },
  confirmBtn:    { backgroundColor: '#00E5FF', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  confirmBtnText:{ color: '#000', fontSize: 16, fontWeight: 'bold' },
  cancelBtn:     { padding: 14, alignItems: 'center' },
  modalCard:     { borderRadius: 20, padding: 22, maxHeight: '92%' },
  mHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  mTitle:        { fontSize: 22, fontWeight: 'bold' },
  label:         { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, marginTop: 16, marginBottom: 8 },
  timePill:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                   borderWidth: 1, borderColor: '#374151', borderRadius: 12,
                   paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#111111' },
  noteInput:     { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 64,
                   textAlignVertical: 'top', backgroundColor: '#111111' },
  dropBtn:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10,
                   padding: 12, backgroundColor: '#111111' },
  dropMenu:      { borderWidth: 1, borderRadius: 10, marginTop: 4, overflow: 'hidden' },
  dropItem:      { padding: 14, borderBottomWidth: 1, borderBottomColor: '#374151' },
  row:           { flexDirection: 'row', gap: 8 },
  repeatBtn:     { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  dayBtn:        { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  snoozeBtn:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  actionBtn:     { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
  dismissBtn:    { backgroundColor: '#EF4444', borderRadius: 14, paddingVertical: 18,
                   paddingHorizontal: 64, alignItems: 'center' },
  card:          { backgroundColor: '#1E293B', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1 },
  fab:           { position: 'absolute', right: 20, bottom: 32, width: 58, height: 58,
                   borderRadius: 29, backgroundColor: '#00E5FF',
                   justifyContent: 'center', alignItems: 'center',
                   elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                   shadowOpacity: 0.3, shadowRadius: 8 },
});
