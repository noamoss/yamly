# YAML Diff UI

A GitHub PR review-style UI for comparing and reviewing changes in YAML documents.

## Features

- **YAML Editor**: CodeMirror-based editor with syntax highlighting and RTL support for Hebrew content
- **File Upload**: Drag-and-drop or click to upload YAML files
- **Diff Visualization**: GitHub PR-style change cards with character-level diff highlighting
- **Threaded Discussions**: Add comments and replies to specific changes
- **Export**: Download diff results and discussions as JSON

## Development

### Prerequisites

- Node.js 18+ and npm
- Access to the Railway API backend

### Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```bash
cp .env.example .env.local
```

3. Update `NEXT_PUBLIC_API_URL` in `.env.local` with your Railway API URL

4. Run development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build

```bash
npm run build
npm start
```

## Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Set root directory to `ui/`
3. Add environment variable `NEXT_PUBLIC_API_URL` with your Railway API URL
4. Deploy

### Railway CORS Configuration

**For Local Development:**
Add `http://localhost:3000` to the Railway API's `CORS_ORIGINS` environment variable in Railway project settings:

```
CORS_ORIGINS=http://localhost:3000
```

**For Production (Vercel):**
After deploying to Vercel, add your Vercel domain to the Railway API's `CORS_ORIGINS` environment variable:

```
CORS_ORIGINS=http://localhost:3000,https://your-vercel-app.vercel.app
```

**Note:** You can add multiple origins separated by commas. Make sure to include both localhost for development and your Vercel domain for production.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **CodeMirror 6** - YAML editor
- **React Query** - API state management
- **Zustand** - Local state for discussions
- **diff-match-patch** - Character-level diff highlighting

## Branding

The UI uses The Pitz Studio's branding guidelines.

### Brand Colors

Brand colors are defined as CSS variables in `app/globals.css`:

- **Primary Blue**: `#2563EB` - Used for buttons, links, active states, and focus outlines
- **Dark Slate**: `#1E293B` - Used for headings, body text, and the wordmark
- **Background**: `#ffffff` - Clean white background

These colors are accessible via CSS variables:
- `--brand-primary: #2563EB`
- `--brand-text: #1E293B`
- `--brand-background: #ffffff`

### Brand Assets

Brand assets are stored in `public/`:

- **Favicon**: `public/favicon.svg` - Studio favicon (SVG format, sourced from about.thepitz.studio)
- **Logo**: Currently using text-based wordmark "the pitz studio" in the header

To update the favicon:
1. Replace `public/favicon.svg` with the new favicon file
2. Ensure the file is optimized (SVG format is recommended for scalability)
3. The favicon is referenced in `app/layout.tsx` via the metadata API

### Branding Components

- **Header Wordmark**: Text-based "the pitz studio" wordmark in the header, linking to `https://about.thepitz.studio/`
- **BrandingBubble**: Floating bubble component (`components/BrandingBubble.tsx`) anchored to bottom-right corner
  - Displays "The Pitz Studio"
  - Links to `https://about.thepitz.studio/`
  - Hidden on mobile devices (visible on `md` breakpoint and above)
  - Fully accessible with keyboard navigation and screen reader support

### Accessibility Requirements

All branding elements must meet WCAG AA contrast requirements:
- Text contrast: Minimum 4.5:1 ratio
- UI component contrast: Minimum 3:1 ratio
- All interactive elements must be keyboard accessible
- Focus states must be visible using the brand primary color
- Screen reader labels must be descriptive (e.g., `aria-label="Made by The Pitz Studio"`)

### Updating Branding

To update branding in the future:

1. **Colors**: Update CSS variables in `app/globals.css` under `:root`
2. **Wordmark**: Modify the header wordmark in `app/page.tsx` (around line 87)
3. **Favicon**: Replace `public/favicon.svg` with the new asset
4. **Bubble**: Update `components/BrandingBubble.tsx` for bubble styling or content
5. **Metadata**: Update page title and description in `app/layout.tsx`

Always verify:
- Color contrast ratios meet WCAG AA standards
- All links work correctly
- Responsive behavior on mobile/tablet/desktop
- Keyboard navigation and accessibility
