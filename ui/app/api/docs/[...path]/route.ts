import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Build the file path from the route params
    const filePath = params.path.join("/");

    // Security: Prevent directory traversal
    if (filePath.includes("..") || filePath.startsWith("/")) {
      return NextResponse.json(
        { error: "Invalid path" },
        { status: 400 }
      );
    }

    // Map documentation paths to actual file locations
    const docPathMap: Record<string, string> = {
      "api/api_server": "docs/api/api_server.md",
      "api/mcp_server": "docs/api/mcp_server.md",
      "developer/api_reference": "docs/developer/api_reference.md",
      "user/getting_started": "docs/user/getting_started.md",
    };

    const actualPath = docPathMap[filePath];
    if (!actualPath) {
      return NextResponse.json(
        { error: "Documentation not found" },
        { status: 404 }
      );
    }

    // Read the markdown file from the project root
    const fullPath = join(process.cwd(), "..", actualPath);
    const content = await readFile(fullPath, "utf-8");

    return NextResponse.json({ content }, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error reading documentation:", error);
    return NextResponse.json(
      { error: "Failed to load documentation" },
      { status: 500 }
    );
  }
}
