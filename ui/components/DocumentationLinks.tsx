"use client";

interface DocumentationLink {
  label: string;
  url: string;
  description: string;
  icon: string;
}

const documentationLinks: DocumentationLink[] = [
  {
    label: "REST API",
    url: "https://github.com/noamoss/yaml_diffs/blob/main/docs/api/api_server.md",
    description: "Use yaml-diffs via HTTP endpoints",
    icon: "🌐",
  },
  {
    label: "MCP Server",
    url: "https://github.com/noamoss/yaml_diffs/blob/main/docs/api/mcp_server.md",
    description: "Integrate with AI assistants",
    icon: "🤖",
  },
  {
    label: "Python Library",
    url: "https://github.com/noamoss/yaml_diffs/blob/main/docs/developer/api_reference.md",
    description: "Use yaml-diffs in your Python code",
    icon: "🐍",
  },
  {
    label: "Getting Started",
    url: "https://github.com/noamoss/yaml_diffs/blob/main/docs/user/getting_started.md",
    description: "Quick start guide",
    icon: "📚",
  },
];

interface DocumentationLinksProps {
  variant?: "dropdown" | "list";
  className?: string;
}

export default function DocumentationLinks({
  variant = "list",
  className = "",
}: DocumentationLinksProps) {
  if (variant === "dropdown") {
    return (
      <div className={`relative group ${className}`}>
        <button
          className="px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base flex items-center gap-2"
          aria-label="Documentation menu"
          aria-expanded="false"
        >
          Documentation
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <div className="py-2">
            {documentationLinks.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{link.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm">
                      {link.label}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {link.description}
                    </div>
                  </div>
                  <svg
                    className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // List variant for help modal
  return (
    <div className={`space-y-3 ${className}`}>
      {documentationLinks.map((link) => (
        <a
          key={link.label}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 border border-gray-200 rounded-lg hover:border-[var(--brand-primary)] hover:bg-blue-50 transition-all group"
        >
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">{link.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm group-hover:text-[var(--brand-primary)] transition-colors">
                {link.label}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {link.description}
              </div>
            </div>
            <svg
              className="h-4 w-4 text-gray-400 group-hover:text-[var(--brand-primary)] flex-shrink-0 mt-0.5 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </div>
        </a>
      ))}
    </div>
  );
}
