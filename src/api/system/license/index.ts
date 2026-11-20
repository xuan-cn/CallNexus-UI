import request from '@/utils/request';

export interface LicenseStatus {
  state: 'UNLICENSED' | 'VALID' | 'EXPIRED' | 'INVALID' | 'NOT_YET_VALID';
  deploymentId?: string;
  publicKeyFingerprint?: string;
  issuerConfigured: boolean;
  licenseId?: string;
  issuedAt?: string;
  expiresAt?: string;
  importedAt?: string;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  message?: string;
}

export const getLicenseStatus = () => request<unknown, { data: LicenseStatus }>({ url: '/api/v1/license/status', method: 'get' });

export const exportLicenseRequest = () => request<unknown, Blob>({ url: '/api/v1/license/request/export', method: 'post', responseType: 'blob' });

export function importLicense(file: File) {
  const data = new FormData();
  data.append('file', file);
  return request<unknown, { data: LicenseStatus }>({ url: '/api/v1/license/import', method: 'post', data });
}
