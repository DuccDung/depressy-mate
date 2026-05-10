import api from './api';

export interface DailyHealthPoint {
  date: string;
  mood_score: number | null;
  assessment_severity: number | null;
  checkin_count: number;
  journal_count: number;
  breathing_minutes: number;
  breathing_sessions: number;
  sleep_minutes: number;
  sleep_sessions: number;
}

export interface AssessmentPoint {
  id: string;
  assessment_code: string;
  date: string;
  overall_severity: number;
  is_red_alert: boolean;
  final_scores: Record<string, number>;
  classifications: Record<string, string>;
}

export interface HealthSummary {
  range: {
    days: number;
    from: string;
    to: string;
  };
  totals: {
    assessments: number;
    checkins: number;
    journals: number;
    breathing_sessions: number;
    breathing_minutes: number;
    sleep_sessions: number;
    sleep_minutes: number;
  };
  latest: {
    assessment_severity: number | null;
    mood_score: number | null;
    last_checkin_at: string | null;
    last_journal_at: string | null;
    last_breathing_at: string | null;
    last_sleep_at: string | null;
  };
  latest_assessments: AssessmentPoint[];
  assessment_series: AssessmentPoint[];
  mood_series: Array<{
    id: string;
    date: string;
    mood: string;
    score: number;
    note: string | null;
  }>;
  daily: DailyHealthPoint[];
  insight: string;
}

export const healthService = {
  getSummary: async (days = 30): Promise<HealthSummary> => {
    const res = await api.get(`/health/summary?days=${days}`);
    return res.data;
  },

  createBreathingSession: async (payload: {
    duration_seconds: number;
    cycles_completed: number;
    total_cycles: number;
    completed: boolean;
  }) => {
    const res = await api.post('/health/breathing-sessions', payload);
    return res.data;
  },

  createSleepSession: async (payload: {
    track_id?: string | null;
    track_title?: string | null;
    duration_ms: number;
    listened_ms: number;
    completed: boolean;
  }) => {
    const res = await api.post('/health/sleep-sessions', payload);
    return res.data;
  },
};
