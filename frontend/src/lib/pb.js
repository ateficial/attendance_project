import PocketBase from 'pocketbase';
import { getApiBaseUrl } from './apiClient';

const pb = new PocketBase(getApiBaseUrl());

// Auto-cancel duplicate requests
pb.autoCancellation(false);

export default pb;
