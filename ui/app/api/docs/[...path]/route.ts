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
      // API documentation
      "api/api_server": "docs/api/api_server.md",
      "api/mcp_server": "docs/api/mcp_server.md",
      // Developer documentation
      "developer/api_reference": "docs/developer/api_reference.md",
      "developer/architecture": "docs/developer/architecture.md",
      "developer/contributing": "docs/developer/contributing.md",
      "developer/diffing_algorithms": "docs/developer/diffing_algorithms.md",
      // Operations documentation
      "operations/ci_cd": "docs/operations/ci_cd.md",
      "operations/deployment": "docs/operations/deployment.md",
      "operations/environment_variables": "docs/operations/environment_variables.md",
      // User documentation
      "user/examples": "docs/user/examples.md",
      "user/getting_started": "docs/user/getting_started.md",
      "user/installation": "docs/user/installation.md",
      "user/schema_reference": "docs/user/schema_reference.md",
      // Root documentation
      "README": "docs/README.md",
      "AGENTS": "AGENTS.md",
    };

    const actualPath = docPathMap[filePath];
    if (!actualPath) {
      return NextResponse.json(
        { error: "Documentation not found" },
        { status: 404 }
      );
    }

    // Read the markdown file from the project root
    // Use environment variable if available, otherwise resolve relative to ui/ directory
    // In Next.js, process.cwd() in API routes is the project root (ui/)
    // So we need to go up one level to reach the actual project root
    const projectRoot = process.env.PROJECT_ROOT || join(process.cwd(), "..");
    const fullPath = join(projectRoot, actualPath);

    // Verify file exists before reading
    try {
      const { access, constants } = await import("fs/promises");
      await access(fullPath, constants.F_OK);
    } catch (accessError) {
      // Log detailed error for server-side debugging
      console.error("File does not exist:", fullPath);
      console.error("Project root:", projectRoot);
      console.error("Actual path:", actualPath);
      // Don't expose file system paths to client
      return NextResponse.json(
        { error: "Documentation file not found" },
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
    // Log detailed error for server-side debugging
    console.error("Error reading documentation:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load documentation";
    // Only include error details in development mode for debugging
    // In production, don't expose internal error details to clients
    return NextResponse.json(
      process.env.NODE_ENV === "development"
        ? { error: errorMessage, details: String(error) }
        : { error: errorMessage },
      { status: 500 }
    );
  }
}
