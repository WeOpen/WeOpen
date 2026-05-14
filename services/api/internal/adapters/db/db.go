// Package db contains the database connection and migration primitives used by the API service.
package db

import (
	"database/sql"
	"errors"
)

// Open validates database connection inputs before delegating to database/sql.
func Open(driverName string, dataSourceName string) (*sql.DB, error) {
	if driverName == "" {
		return nil, errors.New("database driver name is required")
	}
	if dataSourceName == "" {
		return nil, errors.New("database data source name is required")
	}
	return sql.Open(driverName, dataSourceName)
}
