import type { Platform } from './social';

export type Role = 'creator' | 'curator' | 'finance' | 'owner';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type JobType = 'non_visit' | 'visit';
export type FeeType = 'fixed' | 'open' | 'tier';
export type ProductOption = 'shipped' | 'self_purchase' | 'none';
export type JobStatus = 'draft' | 'open' | 'closed' | 'completed';
export type ParticipationStatus = 'invited' | 'applied' | 'approved' | 'rejected' | 'cancelled';
export type ShipmentStatus = 'pending' | 'shipped' | 'received';
export type SubmissionKind = 'storyline' | 'draft' | 'caption' | 'insight';
export type ReviewStatus = 'pending_review' | 'sent_to_brand' | 'approved' | 'revision' | 'rejected';
export type PayoutStatus = 'requested' | 'processing' | 'transferred' | 'failed';

export type Profile = {
  id: string;
  role: Role;
  email: string | null;
  full_name: string | null;
  phone_enc: string | null;
  province: string | null;
  city: string | null;
  categories: string[];
  persona: string | null;
  address_enc: string | null;
  onboarded_at: string | null;
  app_installed_at: string | null;
  created_at: string;
};

export type SocialAccount = {
  id: string;
  creator_id: string;
  platform: Platform;
  url: string;
  username: string;
  followers: number;
  status: VerificationStatus;
  reject_reason: string | null;
  verified_at: string | null;
  created_at: string;
};

export type VisitLocation = { name: string; address?: string; maps_url?: string };

export type Job = {
  id: string;
  client_id: string | null;
  brand_name: string;
  title: string;
  product: string | null;
  job_type: JobType;
  phase: string | null;
  platforms: Platform[];
  deliverables: string;
  brief: string;
  requirements: string | null;
  tiers: string[];
  niches: string[];
  personas: string[];
  min_followers: number;
  fee_type: FeeType;
  fee: number | null;
  rate_cap: number | null;
  tier_fees: Record<string, number>;
  tier_basis: 'largest' | 'primary';
  primary_platform: Platform | null;
  quota: number;
  review_days: number | null;
  product_option: ProductOption;
  visit_locations: VisitLocation[];
  require_purchase_proof: boolean;
  apply_deadline: string | null;
  content_deadline: string | null;
  top_days: 7 | 14 | 30;
  top_mode: 'days' | 'monthly';
  pay_day: number;
  cutoff_day: number;
  require_insight: boolean;
  brand_logo: string | null;
  brand_icon: string;
  status: JobStatus;
  created_at: string;
};

export type Participation = {
  id: string;
  job_id: string;
  creator_id: string;
  status: ParticipationStatus;
  proposed_rate: number | null;
  agreed_fee: number | null;
  applied_at: string;
  decided_at: string | null;
  shipping_address_enc: string | null;
  shipment_status: ShipmentStatus | null;
  courier: string | null;
  tracking_number: string | null;
  visit_location: string | null;
  visit_at: string | null;
  purchase_proof_path: string | null;
  post_url: string | null;
  posted_on: string | null;
  post_url_matches: boolean | null;
  post_submitted_at: string | null;
  post_confirmed_at: string | null;
  ready_at: string | null;
  insight_sent_on: string | null;
  payout_request_id: string | null;
};

export type Submission = {
  id: string;
  participation_id: string;
  kind: SubmissionKind;
  version: number;
  content: string | null;
  photo_paths: string[];
  status: ReviewStatus;
  tali_feedback: string | null;
  brand_feedback: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  approved_at: string | null;
};

export type PayoutRequest = {
  id: string;
  creator_id: string;
  gross: number;
  transfer_fee: number;
  net: number;
  bank_name: string;
  account_last4: string;
  account_number_enc: string;
  holder_name: string;
  status: PayoutStatus;
  requested_at: string;
  due_date: string;
  processing_at: string | null;
  transferred_on: string | null;
  reference_note: string | null;
  failure_reason: string | null;
};

export type PayoutAccount = {
  creator_id: string;
  bank_name: string;
  account_number_enc: string;
  account_last4: string;
  holder_name: string;
};

export type Notification = {
  id: string;
  kind: string;
  params: Record<string, unknown>;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

/** Open-job teaser returned by public_open_jobs(): no brief, visit locations by name only. */
export type PublicJob = Pick<Job,
  'id' | 'brand_name' | 'title' | 'product' | 'job_type' | 'platforms' | 'deliverables' | 'requirements' | 'tiers' | 'niches'
  | 'personas' | 'min_followers' | 'fee_type' | 'fee' | 'rate_cap' | 'tier_fees' | 'tier_basis' | 'primary_platform' | 'quota' | 'review_days' | 'product_option'
  | 'require_purchase_proof' | 'apply_deadline' | 'content_deadline' | 'top_days' | 'top_mode' | 'pay_day' | 'cutoff_day' | 'require_insight' | 'brand_logo' | 'brand_icon' | 'created_at'
> & { visit_location_names: string[] };
