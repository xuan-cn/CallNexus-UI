import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { PhoneNumberForm, PhoneNumberQuery, PhoneNumberVO } from './types';

export const listPhoneNumbers = (query: PhoneNumberQuery): AxiosPromise<PhoneNumberVO[]> =>
  request({ url: '/api/v1/phone-numbers', method: 'get', params: query });

export const getPhoneNumber = (id: string | number): AxiosPromise<PhoneNumberVO> =>
  request({ url: `/api/v1/phone-numbers/${id}`, method: 'get' });

export const createPhoneNumber = (data: PhoneNumberForm) => request({ url: '/api/v1/phone-numbers', method: 'post', data });

export const updatePhoneNumber = (data: PhoneNumberForm) => request({ url: `/api/v1/phone-numbers/${data.id}`, method: 'put', data });

export const deletePhoneNumber = (id: string | number) => request({ url: `/api/v1/phone-numbers/${id}`, method: 'delete' });
