module github.com/WeOpen/WeOpen/internal/plugins/domains

go 1.25.2

require (
	github.com/WeOpen/WeOpen/internal/core v0.0.0
	github.com/WeOpen/WeOpen/internal/providers/domains v0.0.0
)

replace github.com/WeOpen/WeOpen/internal/core => ../../core

replace github.com/WeOpen/WeOpen/internal/providers/domains => ../../providers/domains
