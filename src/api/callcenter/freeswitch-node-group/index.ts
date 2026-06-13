import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { NodeGroupForm, NodeGroupVO } from './types';

export const listNodeGroups = (): AxiosPromise<NodeGroupVO[]> => request({ url: '/api/v1/freeswitch-node-groups', method: 'get' });
export const getNodeGroup = (id: string | number): AxiosPromise<NodeGroupVO> => request({ url: `/api/v1/freeswitch-node-groups/${id}`, method: 'get' });
export const createNodeGroup = (data: NodeGroupForm) => request({ url: '/api/v1/freeswitch-node-groups', method: 'post', data });
export const updateNodeGroup = (data: NodeGroupForm) => request({ url: `/api/v1/freeswitch-node-groups/${data.id}`, method: 'put', data });
export const deleteNodeGroup = (id: string | number) => request({ url: `/api/v1/freeswitch-node-groups/${id}`, method: 'delete' });
