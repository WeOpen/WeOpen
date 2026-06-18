module github.com/WeOpen/WeOpen/platform/plugins/storage_r2

go 1.25.2

require (
	github.com/WeOpen/WeOpen/platform/core v0.0.0
	github.com/WeOpen/WeOpen/platform/providers/r2 v0.0.0
)

replace github.com/WeOpen/WeOpen/platform/core => ../../core

replace github.com/WeOpen/WeOpen/platform/providers/r2 => ../../providers/r2
