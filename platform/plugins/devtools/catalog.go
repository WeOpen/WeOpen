package devtools

// Tool describes a browser-safe developer utility exposed through the API catalog.
type Tool struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Runtime     string `json:"runtime"`
	Status      string `json:"status"`
	Category    string `json:"category"`
	PanelID     string `json:"panelId"`
}

// Panel describes a frontend surface that can host one or more catalog tools.
type Panel struct {
	ID      string   `json:"id"`
	Label   string   `json:"label"`
	ToolIDs []string `json:"toolIds"`
}

var toolCatalog = []Tool{
	{ID: "json-format", Name: "JSON format", Description: "Pretty-print JSON with two-space indentation.", Runtime: "client", Status: "available", Category: "json", PanelID: "json"},
	{ID: "json-compress", Name: "JSON compress", Description: "Remove insignificant JSON whitespace for transport or storage.", Runtime: "client", Status: "available", Category: "json", PanelID: "json"},
	{ID: "base64-encode", Name: "Base64 encode", Description: "Encode UTF-8 text to Base64 without sending content to the API.", Runtime: "client", Status: "available", Category: "encoding", PanelID: "encoding"},
	{ID: "base64-decode", Name: "Base64 decode", Description: "Decode Base64 into UTF-8 text in the browser.", Runtime: "client", Status: "available", Category: "encoding", PanelID: "encoding"},
	{ID: "url-encode", Name: "URL encode", Description: "Encode URL components and query fragments.", Runtime: "client", Status: "available", Category: "encoding", PanelID: "encoding"},
	{ID: "url-decode", Name: "URL decode", Description: "Decode percent-encoded URL text.", Runtime: "client", Status: "available", Category: "encoding", PanelID: "encoding"},
	{ID: "timestamp-to-date", Name: "Timestamp to date", Description: "Convert Unix seconds or milliseconds into ISO 8601.", Runtime: "client", Status: "available", Category: "time", PanelID: "time"},
	{ID: "date-to-timestamp", Name: "Date to timestamp", Description: "Convert parseable dates into Unix milliseconds.", Runtime: "client", Status: "available", Category: "time", PanelID: "time"},
	{ID: "uuid-v4", Name: "UUID v4", Description: "Generate browser-local RFC 4122 UUIDs.", Runtime: "client", Status: "available", Category: "identity", PanelID: "uuid"},
	{ID: "jwt-decode", Name: "JWT decode", Description: "Decode JWT header and payload locally without verification.", Runtime: "client", Status: "available", Category: "security", PanelID: "jwt"},
	{ID: "hash-digest", Name: "Hash digest", Description: "Create SHA digests with Web Crypto.", Runtime: "client", Status: "available", Category: "security", PanelID: "hash"},
	{ID: "hmac-sign", Name: "HMAC sign", Description: "Sign text with HMAC-SHA using Web Crypto.", Runtime: "client", Status: "available", Category: "security", PanelID: "hash"},
	{ID: "regex-test", Name: "Regex tester", Description: "Test JavaScript regular expressions against sample text.", Runtime: "client", Status: "available", Category: "text", PanelID: "regex"},
	{ID: "cron-parser", Name: "Cron parser", Description: "Deferred until a parser dependency is approved.", Runtime: "client", Status: "deferred", Category: "time", PanelID: "cron"},
}

var panelCatalog = []Panel{
	{ID: "json", Label: "JSON", ToolIDs: []string{"json-format", "json-compress"}},
	{ID: "encoding", Label: "Encoding", ToolIDs: []string{"base64-encode", "base64-decode", "url-encode", "url-decode"}},
	{ID: "time", Label: "Time", ToolIDs: []string{"timestamp-to-date", "date-to-timestamp"}},
	{ID: "uuid", Label: "UUID", ToolIDs: []string{"uuid-v4"}},
	{ID: "jwt", Label: "JWT", ToolIDs: []string{"jwt-decode"}},
	{ID: "hash", Label: "Hash/HMAC", ToolIDs: []string{"hash-digest", "hmac-sign"}},
	{ID: "regex", Label: "Regex", ToolIDs: []string{"regex-test"}},
	{ID: "cron", Label: "Cron", ToolIDs: []string{"cron-parser"}},
}

// Tools returns a defensive copy of the backend-owned developer tool catalog.
func Tools() []Tool {
	tools := make([]Tool, len(toolCatalog))
	copy(tools, toolCatalog)
	return tools
}

// Panels returns a defensive copy of the backend-owned tools panel ordering.
func Panels() []Panel {
	panels := make([]Panel, len(panelCatalog))
	for index, panel := range panelCatalog {
		toolIDs := make([]string, len(panel.ToolIDs))
		copy(toolIDs, panel.ToolIDs)
		panel.ToolIDs = toolIDs
		panels[index] = panel
	}
	return panels
}

func availableToolCount() int {
	count := 0
	for _, tool := range toolCatalog {
		if tool.Status == "available" {
			count++
		}
	}
	return count
}
