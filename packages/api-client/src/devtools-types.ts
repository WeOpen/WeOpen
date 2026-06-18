export type ToolRuntime = "client" | "server" | "desktop";

export type ToolStatus = "available" | "deferred";

export type ToolCategory = "json" | "encoding" | "time" | "identity" | "security" | "text";

export type ToolResult = {
  ok: boolean;
  output: string;
  error?: string;
};

export type DeveloperTool = {
  id: string;
  name: string;
  description: string;
  runtime: ToolRuntime;
  status: ToolStatus;
  category: ToolCategory;
  panelId?: string;
};

export type DeveloperToolPanel = {
  id: string;
  label: string;
  toolIds: string[];
};

export type JsonObject = Record<string, unknown>;

export type JwtDecodeResult =
  | {
      ok: true;
      header: JsonObject;
      payload: JsonObject;
      signature: string;
      output: string;
    }
  | {
      ok: false;
      error: string;
      output: string;
    };

export type RegexMatch = {
  value: string;
  index: number;
  groups?: Record<string, string>;
};

export type RegexResult =
  | {
      ok: true;
      matches: RegexMatch[];
      output: string;
    }
  | {
      ok: false;
      matches: RegexMatch[];
      error: string;
      output: string;
    };
