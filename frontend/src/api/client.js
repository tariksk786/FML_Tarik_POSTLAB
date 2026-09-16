/**
 * VehicleSense API Client
 * Interfaces with FastAPI backend endpoints.
 */

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Backend health check failed');
  return res.json();
}

export async function fetchDatasetSummary() {
  const res = await fetch(`${API_BASE}/dataset/summary`);
  if (!res.ok) throw new Error('Failed to fetch dataset summary');
  return res.json();
}

export async function fetchDatasetRows(page = 1, pageSize = 20, classFilter = '', search = '') {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });
  if (classFilter) params.append('class_filter', classFilter);
  if (search) params.append('search', search);

  const res = await fetch(`${API_BASE}/dataset/rows?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch dataset rows');
  return res.json();
}

export async function uploadDatasetFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/dataset/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Failed to upload dataset');
  }
  return data;
}

export function getDatasetDownloadUrl(template = false) {
  return `${API_BASE}/dataset/download?template=${template ? 'true' : 'false'}`;
}

export async function trainModel(config) {
  const res = await fetch(`${API_BASE}/model/train`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Model training failed');
  }
  return data;
}

export async function getModelStatus() {
  const res = await fetch(`${API_BASE}/model/status`);
  if (!res.ok) throw new Error('Failed to fetch model status');
  return res.json();
}

export async function predictSample(features, includeNeighbors = true) {
  const res = await fetch(`${API_BASE}/model/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      features,
      include_neighbors: includeNeighbors,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Prediction failed');
  }
  return data;
}

export async function predictBatch(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/model/predict-batch`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Batch prediction failed');
  }
  return data;
}

export async function fetchHeldOutExamples() {
  const res = await fetch(`${API_BASE}/model/held-out-examples`);
  if (!res.ok) throw new Error('Failed to fetch held-out examples');
  return res.json();
}

export async function fetchVivaContent() {
  const res = await fetch(`${API_BASE}/viva-content`);
  if (!res.ok) throw new Error('Failed to fetch viva content');
  return res.json();
}
