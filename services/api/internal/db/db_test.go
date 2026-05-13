package db

import (
	"context"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type recordingExecer struct {
	statements []string
}

func (r *recordingExecer) ExecContext(_ context.Context, query string, _ ...any) error {
	r.statements = append(r.statements, query)
	return nil
}

func TestLoadMigrationsReadsCoreMigration(t *testing.T) {
	t.Parallel()

	migrations, err := LoadMigrations(rootMigrationFS(t), "up")
	if err != nil {
		t.Fatalf("expected migrations to load: %v", err)
	}

	if len(migrations) == 0 {
		t.Fatal("expected at least one migration")
	}
	if migrations[0].Name != "000001_core.up.sql" {
		t.Fatalf("expected core migration first, got %q", migrations[0].Name)
	}
	if !strings.Contains(migrations[0].SQL, "CREATE TABLE IF NOT EXISTS users") {
		t.Fatal("expected users table in core migration")
	}
}

func TestApplyMigrationsExecutesStatementsInOrder(t *testing.T) {
	t.Parallel()

	execer := &recordingExecer{}
	migrations := []Migration{
		{
			Name: "000001_test.up.sql",
			SQL:  "CREATE TABLE first (id TEXT); CREATE TABLE second (id TEXT);",
		},
	}

	if err := ApplyMigrations(context.Background(), execer, migrations); err != nil {
		t.Fatalf("expected migration to apply: %v", err)
	}

	if len(execer.statements) != 2 {
		t.Fatalf("expected 2 statements, got %d", len(execer.statements))
	}
	if !strings.HasPrefix(execer.statements[0], "CREATE TABLE first") {
		t.Fatalf("expected first statement first, got %q", execer.statements[0])
	}
	if !strings.HasPrefix(execer.statements[1], "CREATE TABLE second") {
		t.Fatalf("expected second statement second, got %q", execer.statements[1])
	}
}

func TestSplitSQLStatementsDropsEmptyFragments(t *testing.T) {
	t.Parallel()

	statements := SplitSQLStatements("CREATE TABLE one (id TEXT); ;\nCREATE TABLE two (id TEXT);\n")
	if len(statements) != 2 {
		t.Fatalf("expected 2 statements, got %d", len(statements))
	}
}

func rootMigrationFS(t *testing.T) fs.FS {
	t.Helper()
	return os.DirFS(filepath.Join("..", "..", "..", "..", "db", "migrations"))
}
