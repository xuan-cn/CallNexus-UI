import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { SkillGroupForm, SkillGroupVO } from './types';

export const listSkillGroups = (): AxiosPromise<SkillGroupVO[]> => request({ url: '/api/v1/skill-groups', method: 'get' });
export const getSkillGroup = (id: string | number): AxiosPromise<SkillGroupVO> => request({ url: `/api/v1/skill-groups/${id}`, method: 'get' });
export const createSkillGroup = (data: SkillGroupForm) => request({ url: '/api/v1/skill-groups', method: 'post', data });
export const updateSkillGroup = (data: SkillGroupForm) => request({ url: `/api/v1/skill-groups/${data.id}`, method: 'put', data });
export const deleteSkillGroup = (id: string | number) => request({ url: `/api/v1/skill-groups/${id}`, method: 'delete' });
