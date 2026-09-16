import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildICS, reminderDue } from '../src/engine/reminders.js';
import { generatePlan } from '../src/engine/plan.js';

const profile = { sex: 'm', age: 30, heightCm: 180, weightKg: 80, goal: 'muskelaufbau', experience: 'fortgeschritten', strengthDays: 3, sessionMinutes: 60, equipment: 'gym', gear: [], limitations: [], priorities: [], cardioSessions: 1, cardio: ['laufen'] };

test('ICS-Export enthält alle Trainingstage des Blocks', () => {
  const plan = generatePlan(profile, { startDate: '2026-09-14' });
  const ics = buildICS(plan, { time: '18:30', durationMin: 60 });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR'));
  const cardioEvents = plan.cardio.sessions.filter((c) => c.weekday != null).length * 5;
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 15 + cardioEvents);
  assert.equal((ics.match(/SUMMARY:LMCI: /g) || []).length, 15);
  if (cardioEvents) assert.ok(ics.includes('SUMMARY:LMCI Cardio:'));
  assert.ok(ics.includes('DTSTART:20260914T183000'));
  assert.ok(ics.includes('SUMMARY:LMCI: Ganzkörper A'));
  assert.ok(ics.includes('(Deload)'));
});

test('Erinnerung wird nur einmal pro Trainingstag fällig', () => {
  const plan = generatePlan(profile, { startDate: '2026-09-14' });
  const s = { plan, workouts: [], cardioLogs: [], settings: { reminders: { enabled: true, time: '18:00', lastFired: null } } };
  const monday18 = new Date(2026, 8, 14, 18, 5);
  assert.ok(reminderDue(s, monday18));
  assert.equal(reminderDue(s, new Date(2026, 8, 14, 17, 0)), null);
  assert.equal(reminderDue({ ...s, workouts: [{ date: '2026-09-14' }] }, monday18), null);
  assert.equal(reminderDue({ ...s, settings: { reminders: { enabled: true, time: '18:00', lastFired: '2026-09-14' } } }, monday18), null);
  const tue = reminderDue(s, new Date(2026, 8, 15, 18, 5)); // Dienstag: kein Krafttag bei 3× (Mo/Mi/Fr) – höchstens Cardio
  assert.ok(!tue || tue.cardio);
  const tueDone = reminderDue({ ...s, cardioLogs: [{ date: '2026-09-15', minutes: 20 }] }, new Date(2026, 8, 15, 18, 5));
  assert.equal(tueDone, null);
});
