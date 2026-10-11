-- PostgreSQL/PostGIS schema for Trọ Ơi. Run once against the DATABASE_URL database.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  email text NOT NULL UNIQUE,
  phone text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('renter', 'landlord', 'admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'locked')),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_role_status_idx ON users(role, status);

CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type text NOT NULL CHECK (type IN ('Khu vực', 'Loại phòng', 'Tiện ích')),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(type, name)
);

CREATE TABLE IF NOT EXISTS listings (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_tenant_id text REFERENCES users(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 8 AND 180),
  description text NOT NULL,
  price_vnd bigint NOT NULL CHECK (price_vnd > 0),
  deposit_vnd bigint CHECK (deposit_vnd IS NULL OR deposit_vnd >= 0),
  deposit_text text NOT NULL DEFAULT 'Thỏa thuận',
  area_m2 numeric(8,2) NOT NULL CHECK (area_m2 > 0),
  location text NOT NULL,
  room_type text NOT NULL,
  contact_phone text,
  amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_url text NOT NULL,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  latitude double precision,
  longitude double precision,
  geom geography(Point, 4326),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'hidden', 'rented', 'rejected')),
  moderation_note text,
  views integer NOT NULL DEFAULT 0 CHECK (views >= 0),
  contacts integer NOT NULL DEFAULT 0 CHECK (contacts >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))
);
CREATE INDEX IF NOT EXISTS listings_status_created_idx ON listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS listings_owner_status_idx ON listings(owner_id, status);
CREATE INDEX IF NOT EXISTS listings_price_area_idx ON listings(price_vnd, area_m2);
CREATE INDEX IF NOT EXISTS listings_geom_idx ON listings USING GIST(geom);

CREATE OR REPLACE FUNCTION listings_set_geom() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN NEW.geom := NULL;
  ELSE NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS listings_geom_trigger ON listings;
CREATE TRIGGER listings_geom_trigger BEFORE INSERT OR UPDATE ON listings
FOR EACH ROW EXECUTE FUNCTION listings_set_geom();

CREATE TABLE IF NOT EXISTS favorites (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id text NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, listing_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  listing_id text NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  author_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  text text NOT NULL CHECK (length(trim(text)) BETWEEN 2 AND 3000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id, author_id)
);
CREATE INDEX IF NOT EXISTS reviews_listing_created_idx ON reviews(listing_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reports (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  reporter_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('Tin phòng', 'Bài viết', 'Bình luận')),
  target_id text NOT NULL,
  target_title text NOT NULL,
  reason text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  admin_note text NOT NULL DEFAULT '',
  resolved_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reports_status_created_idx ON reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_reporter_idx ON reports(reporter_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  detail text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications(user_id, read, created_at DESC);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_reset_expiry_idx ON password_reset_tokens(expires_at);

INSERT INTO categories(type,name) VALUES
  ('Khu vực','Thủ Đức'),('Khu vực','Gò Vấp'),('Khu vực','Bình Thạnh'),('Khu vực','Tân Phú'),
  ('Loại phòng','Phòng trọ'),('Loại phòng','Căn hộ mini'),('Loại phòng','Ở ghép'),('Loại phòng','Ký túc xá'),('Loại phòng','Nhà nguyên căn'),
  ('Tiện ích','Máy lạnh'),('Tiện ích','Bãi đỗ xe'),('Tiện ích','Ban công'),('Tiện ích','Máy giặt'),('Tiện ích','Cho nuôi thú cưng')
ON CONFLICT(type,name) DO NOTHING;
