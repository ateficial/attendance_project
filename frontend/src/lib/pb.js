import PocketBase from 'pocketbase';
const defaultApiBaseUrl = import.meta.env.DEV
	? window.location.origin
	: `http://${window.location.hostname}:8090`;

const pb = new PocketBase((import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl).replace(/\/+$/, ''));

// Auto-cancel duplicate requests
pb.autoCancellation(false);

export default pb;
