module github.com/WeOpen/WeOpen/services/api

go 1.25.2

require (
	github.com/WeOpen/WeOpen/internal/core v0.0.0
	github.com/WeOpen/WeOpen/internal/plugins/blog v0.0.0
)

replace github.com/WeOpen/WeOpen/internal/core => ../../internal/core

replace github.com/WeOpen/WeOpen/internal/plugins/blog => ../../internal/plugins/blog
