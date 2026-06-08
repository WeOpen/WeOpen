module github.com/WeOpen/WeOpen/internal/plugins/storage_r2

go 1.25.2

require (
	github.com/WeOpen/WeOpen/internal/core v0.0.0
	github.com/WeOpen/WeOpen/internal/providers/r2 v0.0.0
)

replace github.com/WeOpen/WeOpen/internal/core => ../../core

replace github.com/WeOpen/WeOpen/internal/providers/r2 => ../../providers/r2
