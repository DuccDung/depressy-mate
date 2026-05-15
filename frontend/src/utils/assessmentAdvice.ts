import dassAdviceData from '../../advide_dass_21.json';
import recommendationData from '../../assessment_recommendations.json';

type RecommendationItem = {
  severity_score: number;
  label: string;
  recommendation: string;
  action_plan: string[];
};

type DassAdviceCase = {
  id: string;
  title: string;
  hex_color: string;
  conclusion: string;
  empathy_message: string;
  detailed_advice: string;
  action_items: string[];
};

export type AssessmentAdvice = {
  title: string;
  label: string;
  conclusion?: string;
  empathyMessage?: string;
  recommendation: string;
  actionPlan: string[];
  color: string;
  isUrgent: boolean;
  source: 'DASS-21' | 'GENERIC';
};

const recommendations = recommendationData as RecommendationItem[];
const dassCases = (dassAdviceData as any).dass21_comprehensive_system.cases as DassAdviceCase[];

const fallbackColors = ['#A8E6CF', '#BDEBD6', '#FFD3B6', '#FFB28B', '#FF8B94'];

const dassBands = {
  Depression: [
    { min: 0, max: 9, severity: 0 },
    { min: 10, max: 13, severity: 1 },
    { min: 14, max: 20, severity: 2 },
    { min: 21, max: 27, severity: 3 },
    { min: 28, max: 999, severity: 4 },
  ],
  Anxiety: [
    { min: 0, max: 7, severity: 0 },
    { min: 8, max: 9, severity: 1 },
    { min: 10, max: 14, severity: 2 },
    { min: 15, max: 19, severity: 3 },
    { min: 20, max: 999, severity: 4 },
  ],
  Stress: [
    { min: 0, max: 14, severity: 0 },
    { min: 15, max: 18, severity: 1 },
    { min: 19, max: 25, severity: 2 },
    { min: 26, max: 33, severity: 3 },
    { min: 34, max: 999, severity: 4 },
  ],
};

export function getAssessmentAdvice(result: any): AssessmentAdvice {
  if (result?.assessment_code === 'DASS-21') {
    const dassAdvice = getDassAdvice(result);
    if (dassAdvice) {
      return dassAdvice;
    }
  }

  return getGenericAdvice(result);
}

function getDassAdvice(result: any): AssessmentAdvice | null {
  const scores = toRecord(result?.final_scores);
  const depression = toNumber(scores.Depression);
  const anxiety = toNumber(scores.Anxiety);
  const stress = toNumber(scores.Stress);

  if (depression === null || anxiety === null || stress === null) {
    return null;
  }

  const depressionSeverity = getDassSeverity('Depression', depression);
  const anxietySeverity = getDassSeverity('Anxiety', anxiety);
  const stressSeverity = getDassSeverity('Stress', stress);
  const verySevereCount = [depressionSeverity, anxietySeverity, stressSeverity].filter((item) => item >= 4).length;

  const matchedCaseId =
    verySevereCount >= 2 ? 'CASE_06'
      : anxiety >= 20 ? 'CASE_03'
      : stress >= 26 && stress <= 33 && depressionSeverity <= 1 && anxietySeverity <= 1 ? 'CASE_02'
      : depression >= 21 && depression <= 27 && anxietySeverity <= 1 && stressSeverity <= 1 ? 'CASE_04'
      : depressionSeverity === 2 && anxietySeverity === 2 && stressSeverity === 2 ? 'CASE_05'
      : depression <= 9 && anxiety <= 7 && stress <= 14 ? 'CASE_01'
      : null;

  const matchedCase = matchedCaseId ? dassCases.find((item) => item.id === matchedCaseId) : null;
  if (!matchedCase) {
    return null;
  }

  return {
    title: matchedCase.title,
    label: 'DASS-21',
    conclusion: matchedCase.conclusion,
    empathyMessage: matchedCase.empathy_message,
    recommendation: matchedCase.detailed_advice,
    actionPlan: matchedCase.action_items.map(cleanAdviceText),
    color: matchedCase.hex_color,
    isUrgent: matchedCase.id === 'CASE_06',
    source: 'DASS-21',
  };
}

function getGenericAdvice(result: any): AssessmentAdvice {
  const rawSeverity = Number(result?.overall_severity ?? 0);
  const severity = Math.min(Math.max(result?.is_red_alert ? Math.max(rawSeverity, 4) : rawSeverity, 0), 4);
  const recommendation = recommendations.find((item) => item.severity_score === severity) || recommendations[0];

  return {
    title: recommendation.label,
    label: result?.assessment_code || 'Bài test',
    recommendation: cleanAdviceText(recommendation.recommendation),
    actionPlan: recommendation.action_plan.map(cleanAdviceText),
    color: fallbackColors[severity] || fallbackColors[0],
    isUrgent: severity >= 4 || Boolean(result?.is_red_alert),
    source: 'GENERIC',
  };
}

function getDassSeverity(category: keyof typeof dassBands, score: number) {
  return dassBands[category].find((band) => score >= band.min && score <= band.max)?.severity ?? 0;
}

function toRecord(value: any): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function toNumber(value: any): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanAdviceText(value: string) {
  return String(value).replace(/\[cite:\s*[\d,\s]+\]/g, '').trim();
}
