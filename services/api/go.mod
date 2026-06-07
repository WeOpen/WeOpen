module github.com/WeOpen/WeOpen/services/api

go 1.25.2

require (
	github.com/WeOpen/WeOpen/internal/core v0.0.0
	github.com/WeOpen/WeOpen/internal/plugins/blog v0.0.0
	github.com/WeOpen/WeOpen/internal/plugins/devtools v0.0.0
	github.com/WeOpen/WeOpen/internal/plugins/domains v0.0.0
	github.com/WeOpen/WeOpen/internal/plugins/storage_r2 v0.0.0
	github.com/WeOpen/WeOpen/internal/providers/cloudflare v0.0.0
	github.com/WeOpen/WeOpen/internal/providers/r2 v0.0.0
	github.com/jackc/pgx/v5 v5.10.0
	modernc.org/sqlite v1.52.0
)

require (
	github.com/WeOpen/WeOpen/internal/providers/domains v0.0.0 // indirect
	github.com/dustin/go-humanize v1.0.1 // indirect
	github.com/google/uuid v1.6.0 // indirect
	github.com/jackc/pgpassfile v1.0.0 // indirect
	github.com/jackc/pgservicefile v0.0.0-20240606120523-5a60cdf6a761 // indirect
	github.com/jackc/puddle/v2 v2.2.2 // indirect
	github.com/mattn/go-isatty v0.0.20 // indirect
	github.com/ncruces/go-strftime v1.0.0 // indirect
	github.com/remyoudompheng/bigfft v0.0.0-20230129092748-24d4a6f8daec // indirect
	golang.org/x/sync v0.20.0 // indirect
	golang.org/x/sys v0.42.0 // indirect
	golang.org/x/text v0.29.0 // indirect
	modernc.org/libc v1.72.3 // indirect
	modernc.org/mathutil v1.7.1 // indirect
	modernc.org/memory v1.11.0 // indirect
)

replace github.com/WeOpen/WeOpen/internal/core => ../../internal/core

replace github.com/WeOpen/WeOpen/internal/plugins/blog => ../../internal/plugins/blog

replace github.com/WeOpen/WeOpen/internal/plugins/storage_r2 => ../../internal/plugins/storage_r2

replace github.com/WeOpen/WeOpen/internal/providers/r2 => ../../internal/providers/r2

replace github.com/WeOpen/WeOpen/internal/plugins/devtools => ../../internal/plugins/devtools

replace github.com/WeOpen/WeOpen/internal/plugins/domains => ../../internal/plugins/domains

replace github.com/WeOpen/WeOpen/internal/providers/cloudflare => ../../internal/providers/cloudflare

replace github.com/WeOpen/WeOpen/internal/providers/domains => ../../internal/providers/domains
