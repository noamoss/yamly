import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  try {
    // Handle both sync and async params (Next.js 15+ uses async)
    const params = await Promise.resolve(context.params);
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
    // In Next.js, process.cwd() in API routes is the project root (ui/)
    // So we need to go up one level to reach the actual project root
    const projectRoot = join(process.cwd(), "..");
    const fullPath = join(projectRoot, actualPath);

    // Verify file exists before reading
    try {
      const { access, constants } = await import("fs/promises");
      await access(fullPath, constants.F_OK);
    } catch (accessError) {
      console.error("File does not exist:", fullPath);
      console.error("Project root:", projectRoot);
      console.error("Actual path:", actualPath);
      return NextResponse.json(
        { error: `File not found: ${fullPath}` },
        { status: 404 }
      );
    }

    const content = await readFile(fullPath, "utf-8");

    return NextResponse.json({ content }, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error reading documentation:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load documentation";
    return NextResponse.json(
      { error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}
