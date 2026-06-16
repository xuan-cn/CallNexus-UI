export interface BusinessHoursPeriod {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface BusinessHoursException {
  exceptionDate: string;
  exceptionType: 'CLOSED' | 'CUSTOM';
  startTime?: string;
  endTime?: string;
  description?: string;
}

export interface BusinessHoursPlan {
  id?: string | number;
  planCode: string;
  planName: string;
  timezone: string;
  enabled: boolean;
  remark?: string;
  periods: BusinessHoursPeriod[];
  exceptions: BusinessHoursException[];
}

export interface BusinessHoursEvaluation {
  inBusinessHours: boolean;
  evaluatedAt: string;
  timezone: string;
  reason: string;
  nextOpenTime?: string;
}
