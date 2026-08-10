import type { BirthForm } from './divination';

export interface SelectableCaseProfile extends BirthForm {
  id: string;
  label: string;
  available?: boolean;
}

export function caseDisplayName(profile: SelectableCaseProfile) {
  return profile.label.trim() || profile.name.trim() || '未命名案例';
}

export function caseBirthSummary(profile: SelectableCaseProfile) {
  const calendar = profile.dateType === 'lunar' ? `农历${profile.isLeapMonth ? '闰月' : ''}` : '公历';
  const dateTime = [profile.date, profile.time].filter(Boolean).join(' ');
  return [dateTime ? `${calendar}${dateTime}` : '', profile.locationName].filter(Boolean).join(' · ');
}
