import {
  createPolicySourceRecord,
  normalizePolicySourceInput,
  validatePolicySourceInput
} from '../models/policySourceModel.js';
import {
  getPolicySourceById,
  listPolicySources,
  policySourceNameExists,
  savePolicySource
} from '../repositories/policySourceRepository.js';

export function getAllPolicySources() {
  return listPolicySources().sort((a, b) => {
    const left = String(a.updatedAt || a.createdAt || '');
    const right = String(b.updatedAt || b.createdAt || '');
    return right.localeCompare(left);
  });
}

export function getPolicySourceDetail(id) {
  return getPolicySourceById(id);
}

export function createPolicySource(input = {}) {
  const normalized = normalizePolicySourceInput(input);
  const errors = validatePolicySourceInput(normalized);

  if (policySourceNameExists(normalized.name)) {
    errors.push('A policy source with the same name already exists.');
  }

  if (errors.length > 0) {
    const error = new Error('Invalid policy source input.');
    error.code = 'INVALID_POLICY_SOURCE';
    error.statusCode = 400;
    error.details = errors;
    throw error;
  }

  const record = createPolicySourceRecord(normalized);
  return savePolicySource(record);
}
