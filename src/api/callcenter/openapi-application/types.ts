export interface OpenApiIpRule {
  cidr: string;
  description?: string;
  enabled: boolean;
}

export interface OpenApiApplicationVO {
  id: string | number;
  appCode: string;
  appName: string;
  enabled: boolean;
  tokenTtlSeconds: number;
  requestsPerMinute: number;
  maxConcurrentCalls: number;
  websocketEnabled: boolean;
  webhookEnabled: boolean;
  webhookUrl?: string;
  webhookSecretConfigured: boolean;
  eventTypes: string[];
  description?: string;
  version: number;
  createTime?: string;
  scopes: string[];
  ipRules: OpenApiIpRule[];
  routePolicyCodes: string[];
}

export interface OpenApiApplicationForm {
  appCode: string;
  appName: string;
  enabled: boolean;
  tokenTtlSeconds: number;
  requestsPerMinute: number;
  maxConcurrentCalls: number;
  websocketEnabled: boolean;
  webhookEnabled: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
  eventTypes: string[];
  description?: string;
  version?: number;
  scopes: string[];
  ipRules: OpenApiIpRule[];
  routePolicyCodes: string[];
}

export interface OpenApiCredentialVO {
  id: string | number;
  applicationId: string | number;
  credentialName: string;
  clientId: string;
  secretHint: string;
  status: 'ACTIVE' | 'REVOKED';
  expiresAt?: string;
  lastUsedAt?: string;
  createTime?: string;
}

export interface OpenApiCredentialForm {
  credentialName: string;
  expiresAt?: string;
}

export interface OpenApiCredentialSecretVO {
  credentialId: string | number;
  clientId: string;
  clientSecret: string;
  warning: string;
}
