import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { FormBusinessType, FormTemplate } from './types';

export const listFormTemplates = (businessType?: FormBusinessType): AxiosPromise<FormTemplate[]> =>
  request({ url: '/api/v1/form-templates', method: 'get', params: { businessType } });

export const getFormTemplate = (id: string | number): AxiosPromise<FormTemplate> => request({ url: `/api/v1/form-templates/${id}`, method: 'get' });

export const createFormTemplate = (data: FormTemplate) => request({ url: '/api/v1/form-templates', method: 'post', data });

export const updateFormTemplate = (data: FormTemplate) => request({ url: `/api/v1/form-templates/${data.id}`, method: 'put', data });

export const deleteFormTemplate = (id: string | number) => request({ url: `/api/v1/form-templates/${id}`, method: 'delete' });
