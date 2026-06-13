import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { MediaAssetForm, MediaAssetQuery, MediaAssetUploadForm, MediaAssetVO, MediaSyncVO, MediaVersionVO } from './types';

export const listMediaAssets = (query: MediaAssetQuery): AxiosPromise<MediaAssetVO[]> =>
  request({ url: '/api/v1/media-assets', method: 'get', params: query });

export const getMediaAsset = (id: string | number): AxiosPromise<MediaAssetVO> =>
  request({ url: `/api/v1/media-assets/${id}`, method: 'get' });

export const uploadMediaAsset = (form: MediaAssetUploadForm) => {
  const data = new FormData();
  data.append('assetName', form.assetName);
  data.append('category', form.category);
  if (form.languageCode) data.append('languageCode', form.languageCode);
  if (form.remark) data.append('remark', form.remark);
  if (form.durationMs !== undefined) data.append('durationMs', String(form.durationMs));
  data.append('file', form.file);
  return request({ url: '/api/v1/media-assets', method: 'post', data });
};

export const updateMediaAsset = (form: MediaAssetForm) => request({ url: `/api/v1/media-assets/${form.id}`, method: 'put', data: form });

export const deleteMediaAsset = (id: string | number) => request({ url: `/api/v1/media-assets/${id}`, method: 'delete' });

export const listMediaVersions = (id: string | number): AxiosPromise<MediaVersionVO[]> =>
  request({ url: `/api/v1/media-assets/${id}/versions`, method: 'get' });
export const listMediaPublicationGroups = (id: string | number): AxiosPromise<Array<string | number>> =>
  request({ url: `/api/v1/media-assets/${id}/publication-groups`, method: 'get' });
export const uploadMediaVersion = (id: string | number, file: File, durationMs?: number) => {
  const data = new FormData();
  data.append('file', file);
  if (durationMs !== undefined) data.append('durationMs', String(durationMs));
  return request({ url: `/api/v1/media-assets/${id}/versions`, method: 'post', data });
};
export const publishMedia = (id: string | number, nodeGroupIds: Array<string | number>) =>
  request({ url: `/api/v1/media-assets/${id}/publish`, method: 'post', data: { nodeGroupIds } });
export const unpublishMedia = (id: string | number) => request({ url: `/api/v1/media-assets/${id}/unpublish`, method: 'post' });
export const listMediaSyncs = (id: string | number): AxiosPromise<MediaSyncVO[]> =>
  request({ url: `/api/v1/media-assets/${id}/syncs`, method: 'get' });
export const retryMediaSyncs = (id: string | number) => request({ url: `/api/v1/media-assets/${id}/syncs/retry`, method: 'post' });
