package db

import (
	"database/sql"
	"errors"
)

func Open(driverName string, dataSourceName string) (*sql.DB, error) {
	if driverName == "" {
		return nil, errors.New("database driver name is required")
	}
	if dataSourceName == "" {
		return nil, errors.New("database data source name is required")
	}
	return sql.Open(driverName, dataSourceName)
}
