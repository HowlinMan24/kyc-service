import { KycProfile, AuditLog, type KycStatus } from '../models/index.js';
import { Conflict, NotFound, BadRequest } from '../utils/errors.js';

export interface KycInput {
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  documentType: 'passport' | 'id_card' | 'driver_license';
  documentNumber: string;
}

/**
 * Deterministic, transparent risk scoring used as a placeholder for a real
 * provider integration (Onfido / Sumsub / Veriff). 0–100, higher = riskier.
 */
export function computeRiskScore(input: KycInput): number {
  let score = 0;
  const age = ageInYears(input.dateOfBirth);
  if (age < 18) score += 60;
  else if (age < 21) score += 25;
  else if (age > 80) score += 15;

  // High-risk jurisdictions list (illustrative — production lists come from FATF / EU).
  const HIGH_RISK = new Set(['IR', 'KP', 'SY', 'MM']);
  if (HIGH_RISK.has(input.nationality.toUpperCase())) score += 50;

  // Document type weighting — passport is the strongest identity document.
  if (input.documentType === 'driver_license') score += 5;
  if (input.documentType === 'id_card') score += 2;

  // Short document numbers are suspicious.
  if (input.documentNumber.length < 6) score += 20;

  return Math.min(100, score);
}

function ageInYears(iso: string): number {
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) throw BadRequest('Invalid dateOfBirth');
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export async function submitProfile(userId: string, input: KycInput): Promise<KycProfile> {
  const existing = await KycProfile.findOne({ where: { userId } });
  if (existing && existing.status !== 'rejected') {
    throw Conflict('A KYC profile already exists for this user');
  }
  const riskScore = computeRiskScore(input);
  // Auto-decision band: <20 auto-approve, 20–69 in_review, >=70 reject
  let status: KycStatus = 'in_review';
  let rejectionReason: string | null = null;
  if (riskScore < 20) status = 'approved';
  else if (riskScore >= 70) {
    status = 'rejected';
    rejectionReason = 'High risk score from automated screening';
  }

  const profile = existing
    ? await existing.update({ ...input, riskScore, status, rejectionReason })
    : await KycProfile.create({ userId, ...input, riskScore, status, rejectionReason });

  await AuditLog.create({
    actorId: userId,
    action: 'kyc.submit',
    resource: 'kyc_profile',
    resourceId: profile.id,
    metadata: { riskScore, status },
  });
  return profile;
}

export async function getOwnProfile(userId: string): Promise<KycProfile> {
  const profile = await KycProfile.findOne({ where: { userId } });
  if (!profile) throw NotFound('No KYC profile yet');
  return profile;
}

export async function decide(
  profileId: string,
  reviewerId: string,
  decision: 'approved' | 'rejected',
  reason?: string,
): Promise<KycProfile> {
  const profile = await KycProfile.findByPk(profileId);
  if (!profile) throw NotFound('Profile not found');
  await profile.update({ status: decision, rejectionReason: decision === 'rejected' ? reason ?? null : null });
  await AuditLog.create({
    actorId: reviewerId,
    action: `kyc.${decision}`,
    resource: 'kyc_profile',
    resourceId: profile.id,
    metadata: { reason },
  });
  return profile;
}

export async function listForReview(): Promise<KycProfile[]> {
  return KycProfile.findAll({ where: { status: 'in_review' }, order: [['createdAt', 'ASC']] });
}
