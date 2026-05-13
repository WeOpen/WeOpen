package db

import (
	"context"
	"fmt"
	"io/fs"
	"sort"
	"strings"
)

type Execer interface {
	ExecContext(ctx context.Context, query string, args ...any) error
}

type Migration struct {
	Name      string
	Direction string
	SQL       string
}

func LoadMigrations(fsys fs.FS, direction string) ([]Migration, error) {
	if direction != "up" && direction != "down" {
		return nil, fmt.Errorf("unsupported migration direction %q", direction)
	}

	entries, err := fs.ReadDir(fsys, ".")
	if err != nil {
		return nil, fmt.Errorf("read migrations: %w", err)
	}

	var migrations []Migration
	suffix := "." + direction + ".sql"
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), suffix) {
			continue
		}
		content, err := fs.ReadFile(fsys, entry.Name())
		if err != nil {
			return nil, fmt.Errorf("read migration %s: %w", entry.Name(), err)
		}
		migrations = append(migrations, Migration{
			Name:      entry.Name(),
			Direction: direction,
			SQL:       string(content),
		})
	}

	sort.Slice(migrations, func(i, j int) bool {
		if direction == "down" {
			return migrations[i].Name > migrations[j].Name
		}
		return migrations[i].Name < migrations[j].Name
	})

	return migrations, nil
}

func ApplyMigrations(ctx context.Context, execer Execer, migrations []Migration) error {
	for _, migration := range migrations {
		statements := SplitSQLStatements(migration.SQL)
		for _, statement := range statements {
			if err := execer.ExecContext(ctx, statement); err != nil {
				return fmt.Errorf("apply migration %s: %w", migration.Name, err)
			}
		}
	}
	return nil
}

func SplitSQLStatements(sqlText string) []string {
	raw := strings.Split(sqlText, ";")
	statements := make([]string, 0, len(raw))
	for _, statement := range raw {
		statement = strings.TrimSpace(statement)
		if statement == "" || strings.HasPrefix(statement, "--") {
			continue
		}
		statements = append(statements, statement)
	}
	return statements
}
