import { apiDownloadBlob, apiFetch, apiUpload } from './client';
import type {
  OnboardingData,
  OnboardingDoc,
  OnboardingEducation,
  OnboardingEmergency,
  OnboardingListItem,
  OnboardingNominee,
  OnboardingPrevEmp,
} from './types';

export interface SaveOnboardingInput {
  gender?: string;
  dateOfBirth?: string;
  maritalStatus?: string;
  nationality?: string;
  bloodGroup?: string;
  personalEmail?: string;
  alternatePhone?: string;
  currentAddress?: string;
  permanentAddress?: string;
  aadhaarRef?: string;
  panRef?: string;
  uan?: string;
  prevPfMember?: boolean;
  esiNumber?: string;
  passportNumber?: string;
  passportExpiry?: string;
  drivingLicense?: string;
  drivingLicenseExpiry?: string;
  bankAccountHolder?: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
  bankBranch?: string;
  education?: OnboardingEducation[];
  previousEmployment?: OnboardingPrevEmp[];
  emergencyContacts?: OnboardingEmergency[];
  nominees?: OnboardingNominee[];
}

// Employee self-service
export const getMyOnboarding = () => apiFetch<OnboardingData>('/onboarding/me');
export const saveMyOnboarding = (input: SaveOnboardingInput) =>
  apiFetch<OnboardingData>('/onboarding/me', { method: 'PUT', body: input });
export const submitMyOnboarding = () =>
  apiFetch<OnboardingData>('/onboarding/me/submit', { method: 'POST', body: {} });

export const uploadOnboardingDoc = (file: File, docType: string) => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('docType', docType);
  return apiUpload<OnboardingDoc>('/onboarding/me/documents', fd);
};

export const downloadOnboardingDoc = (id: string) =>
  apiDownloadBlob(`/onboarding/documents/${id}/download`);

// HR review
export const listOnboarding = () => apiFetch<OnboardingListItem[]>('/onboarding');
export const getOnboardingFor = (employeeId: string) =>
  apiFetch<OnboardingData>(`/onboarding/${employeeId}`);
export const reviewOnboarding = (employeeId: string, decision: 'APPROVE' | 'REJECT', note?: string) =>
  apiFetch<OnboardingData>(`/onboarding/${employeeId}/review`, {
    method: 'PATCH',
    body: { decision, note },
  });
