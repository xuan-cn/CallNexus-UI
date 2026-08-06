import request from '@/utils/request';
import type { AxiosPromise } from 'axios';
import type { OpenApiApplicationForm, OpenApiApplicationVO, OpenApiCredentialForm, OpenApiCredentialSecretVO, OpenApiCredentialVO } from './types';

const baseUrl = '/api/v1/openapi/applications';

export const listOpenApiApplications = (): AxiosPromise<OpenApiApplicationVO[]> => request({ url: baseUrl, method: 'get' });

export const getOpenApiApplication = (id: string | number): AxiosPromise<OpenApiApplicationVO> => request({ url: `${baseUrl}/${id}`, method: 'get' });

export const listOpenApiScopes = (): AxiosPromise<string[]> => request({ url: `${baseUrl}/available-scopes`, method: 'get' });
export const listOpenApiEvents = (): AxiosPromise<string[]> => request({ url: `${baseUrl}/available-events`, method: 'get' });

export const createOpenApiApplication = (data: OpenApiApplicationForm): AxiosPromise<string | number> =>
  request({ url: baseUrl, method: 'post', data });

export const updateOpenApiApplication = (id: string | number, data: OpenApiApplicationForm) =>
  request({ url: `${baseUrl}/${id}`, method: 'put', data });

export const deleteOpenApiApplication = (id: string | number) => request({ url: `${baseUrl}/${id}`, method: 'delete' });

export const listOpenApiCredentials = (applicationId: string | number): AxiosPromise<OpenApiCredentialVO[]> =>
  request({ url: `${baseUrl}/${applicationId}/credentials`, method: 'get' });

export const createOpenApiCredential = (applicationId: string | number, data: OpenApiCredentialForm): AxiosPromise<OpenApiCredentialSecretVO> =>
  request({ url: `${baseUrl}/${applicationId}/credentials`, method: 'post', data });

export const rotateOpenApiCredential = (applicationId: string | number, credentialId: string | number): AxiosPromise<OpenApiCredentialSecretVO> =>
  request({ url: `${baseUrl}/${applicationId}/credentials/${credentialId}/rotate`, method: 'post' });

export const revokeOpenApiCredential = (applicationId: string | number, credentialId: string | number) =>
  request({ url: `${baseUrl}/${applicationId}/credentials/${credentialId}/revoke`, method: 'post' });
