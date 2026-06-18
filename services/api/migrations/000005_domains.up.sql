CREATE TABLE IF NOT EXISTS domain_assets (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  name_servers_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  certificate_status TEXT NOT NULL DEFAULT 'unchecked',
  certificate_expires_at TIMESTAMPTZ,
  certificate_days_remaining INTEGER,
  certificate_checked_at TIMESTAMPTZ,
  certificate_error TEXT NOT NULL DEFAULT '',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_domain_assets_provider ON domain_assets(provider);
CREATE INDEX IF NOT EXISTS idx_domain_assets_name ON domain_assets(name);
CREATE INDEX IF NOT EXISTS idx_domain_assets_certificate_status ON domain_assets(certificate_status);

CREATE TABLE IF NOT EXISTS dns_record_snapshots (
  id TEXT PRIMARY KEY,
  domain_asset_id TEXT NOT NULL REFERENCES domain_assets(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  ttl INTEGER NOT NULL DEFAULT 1,
  proxied BOOLEAN NOT NULL DEFAULT FALSE,
  priority INTEGER,
  comment TEXT NOT NULL DEFAULT '',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ,
  modified_at TIMESTAMPTZ,
  UNIQUE (domain_asset_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_dns_record_snapshots_domain_asset_id ON dns_record_snapshots(domain_asset_id);
CREATE INDEX IF NOT EXISTS idx_dns_record_snapshots_name ON dns_record_snapshots(name);
