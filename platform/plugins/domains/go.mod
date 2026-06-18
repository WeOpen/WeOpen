module github.com/WeOpen/WeOpen/platform/plugins/domains

go 1.25.2

require (
	github.com/WeOpen/WeOpen/platform/core v0.0.0
	github.com/WeOpen/WeOpen/platform/providers/domains v0.0.0
)

replace github.com/WeOpen/WeOpen/platform/core => ../../core

replace github.com/WeOpen/WeOpen/platform/providers/domains => ../../providers/domains
