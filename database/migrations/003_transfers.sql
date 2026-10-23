CREATE TABLE IF NOT EXISTS transfers (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 8 AND 180),
  description text NOT NULL CHECK (length(trim(description)) BETWEEN 20 AND 4000),
  location text NOT NULL CHECK (length(trim(location)) BETWEEN 2 AND 300),
  monthly_rent_vnd bigint NOT NULL CHECK (monthly_rent_vnd > 0),
  transfer_fee_vnd bigint CHECK (transfer_fee_vnd IS NULL OR transfer_fee_vnd >= 0),
  deposit_text text NOT NULL DEFAULT 'Thỏa thuận',
  area_m2 numeric(8,2) NOT NULL CHECK (area_m2 > 0),
  room_type text NOT NULL,
  contract_end_date date NOT NULL,
  available_from date,
  amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_url text NOT NULL DEFAULT '',
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'closed', 'removed')),
  moderation_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transfers_status_created_idx ON transfers(status, created_at DESC);
CREATE INDEX IF NOT EXISTS transfers_owner_status_idx ON transfers(owner_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS transfers_rent_area_idx ON transfers(monthly_rent_vnd, area_m2);
