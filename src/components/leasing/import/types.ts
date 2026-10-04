export type ExtractedContract = {
  lessee_name: string;
  lessee_id?: string;
  lessee_email?: string;
  lessee_phone?: string;
  contract_ref?: string;
  contract_status?: string;
  start_date?: string;
  end_date?: string;
  maturity_date?: string;
  duration_months?: number;
  asset_type?: string;
  asset_description?: string;
  asset_value?: number;
  residual_value?: number;
  monthly_rent?: number;
  total_amount?: number;
  remaining_capital?: number;
  interest_rate?: number;
  payment_frequency?: string;
  next_payment_date?: string;
  overdue_amount?: number;
  overdue_days?: number;
  risk_score?: number;
  risk_level?: string;
  ai_confidence?: number;
  notes?: string;
};

export type FileJob = {
  id: string;
  file: File;
  status: 'queued' | 'reading' | 'analyzing' | 'uploading' | 'inserting' | 'done' | 'error';
  progress: number;
  message?: string;
  extracted: ExtractedContract[];
  inserted: number;
  error?: string;
};

export type LeasingRow = ExtractedContract & {
  id: string;
  user_id: string;
  source_file_url?: string | null;
  source_file_name?: string | null;
  imported_at: string;
  created_at: string;
  updated_at: string;
};
