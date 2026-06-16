import request from '@/utils/request';
import type { AxiosPromise } from 'axios';
import type { BusinessHoursEvaluation, BusinessHoursPlan } from './types';

export const listBusinessHoursPlans = (): AxiosPromise<BusinessHoursPlan[]> =>
  request({ url: '/api/v1/business-hours-plans', method: 'get' });
export const getBusinessHoursPlan = (id: string | number): AxiosPromise<BusinessHoursPlan> =>
  request({ url: `/api/v1/business-hours-plans/${id}`, method: 'get' });
export const createBusinessHoursPlan = (data: BusinessHoursPlan) =>
  request({ url: '/api/v1/business-hours-plans', method: 'post', data });
export const updateBusinessHoursPlan = (data: BusinessHoursPlan) =>
  request({ url: `/api/v1/business-hours-plans/${data.id}`, method: 'put', data });
export const deleteBusinessHoursPlan = (id: string | number) =>
  request({ url: `/api/v1/business-hours-plans/${id}`, method: 'delete' });
export const evaluateBusinessHoursPlan = (id: string | number, evaluatedAt?: string): AxiosPromise<BusinessHoursEvaluation> =>
  request({ url: `/api/v1/business-hours-plans/${id}/evaluate`, method: 'post', data: { evaluatedAt } });
