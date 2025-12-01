# Environment Variables Management Guide

This guide explains how to add or update environment variables in different environments (local development, Railway production, etc.).

## Table of Contents

- [Local Development (.env file)](#local-development-env-file)
- [Railway Production](#railway-production)
- [GitHub Actions CI/CD](#github-actions-cicd)
- [Next.js UI (Vercel/Other)](#nextjs-ui-vercelother)
- [System Environment Variables](#system-environment-variables)

---

## Local Development (.env file)

### Creating/Updating .env File

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file** with your preferred text editor:
   ```bash
   # Using nano
   nano .env

   # Using vim
   vim .env

   # Using VS Code
   code .env
   ```

3. **Add or modify variables:**
   ```bash
   # Example: Update API URL
   YAML_DIFFS_API_URL=http://localhost:8000

   # Example: Set custom timeout
   YAML_DIFFS_API_TIMEOUT=60

   # Example: Configure CORS for local frontend
   CORS_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

4. **Save the file** - Changes take effect immediately for new processes

5. **Restart any running services** that need to pick up the changes:
   ```bash
   # If running API server, restart it
   # Ctrl+C to stop, then restart:
   uvicorn src.yamly.api_server.main:app --reload --port 8000
   ```

### Important Notes

- **Never commit `.env` to git** - It's in `.gitignore` for security
- **Use `.env.example` as a template** - It shows all available variables
- **Python scripts** automatically load `.env` using `python-dotenv`
- **Bash scripts** source `.env` if it exists (see `scripts/verify_railway_deployment.sh`)

---

## Railway Production

### Via Railway Dashboard (Recommended)

1. **Go to Railway Dashboard:**
   - Visit [railway.app](https://railway.app)
   - Select your project: `yaml_diffs`
   - Click on your service

2. **Navigate to Variables:**
   - Click on the **"Variables"** tab in the left sidebar
   - Or go to **Settings** → **Variables**

3. **Add/Update Variables:**
   - Click **"+ New Variable"** to add a new variable
   - Click on an existing variable to edit it
   - Enter the variable name (e.g., `CORS_ORIGINS`)
   - Enter the value (e.g., `https://yourdomain.com`)
   - Click **"Add"** or **"Update"**

4. **Deploy Changes:**
   - Railway automatically redeploys when you save variables
   - Wait for deployment to complete (check the **Deployments** tab)

### Via Railway CLI

1. **Install Railway CLI:**
   ```bash
   # macOS
   brew install railway

   # Or via npm
   npm install -g @railway/cli
   ```

2. **Login:**
   ```bash
   railway login
   ```

3. **Link to your project:**
   ```bash
   railway link
   ```

4. **Set variables:**
   ```bash
   # Set a single variable
   railway variables set CORS_ORIGINS="https://yourdomain.com"

   # Set multiple variables from a file
   railway variables set --file .env.production

   # View all variables
   railway variables

   # Get a specific variable
   railway variables get CORS_ORIGINS

   # Delete a variable
   railway variables unset CORS_ORIGINS
   ```

### Important Notes

- **Railway automatically sets `PORT`** - Don't override it
- **Changes trigger automatic redeployment** - No manual deploy needed
- **Variables are encrypted** - Secure storage in Railway
- **Use specific domains for CORS** - Never use `*` in production

---

## GitHub Actions CI/CD

### Adding Secrets to GitHub

1. **Go to Repository Settings:**
   - Visit your repository on GitHub
   - Click **Settings** → **Secrets and variables** → **Actions**

2. **Add Repository Secret:**
   - Click **"New repository secret"**
   - Enter the name (e.g., `RAILWAY_DOMAIN`)
   - Enter the value
   - Click **"Add secret"**

3. **Use in Workflow:**
   ```yaml
   # .github/workflows/deploy.yml
   env:
     HEALTH_CHECK_URL: https://${{ secrets.RAILWAY_DOMAIN }}/health
   ```

#### Example: Setting Up RAILWAY_DOMAIN Secret

The `RAILWAY_DOMAIN` secret is required for the deployment workflow to verify Railway deployments. Here's how to set it up:

**Step 1: Find Your Railway Domain**

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your project → Your service
3. Find the domain in one of these places:
   - **Settings** → **Domains** tab
   - Service URL in the dashboard (set via `RAILWAY_DOMAIN` environment variable)

**Step 2: Add the Secret**

1. In GitHub: **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Enter:
   - **Name**: `RAILWAY_DOMAIN`
   - **Value**: Your Railway domain (set via `RAILWAY_DOMAIN` environment variable)
4. Click **"Add secret"**

**Important Format Requirements**:

- ✅ **Correct**: `api-yamly.thepitz.studio` (domain only, no protocol) - set via `RAILWAY_DOMAIN`
- ❌ **Incorrect**: `https://api-yamly.thepitz.studio` (includes protocol - will cause issues)
- ❌ **Incorrect**: `api-yamly.thepitz.studio/` (trailing slash - will cause issues)

The workflow constructs the full URL automatically: `https://${{ secrets.RAILWAY_DOMAIN }}/health`

For more detailed setup instructions, see [CI/CD Documentation - Setting Up RAILWAY_DOMAIN Secret](../operations/ci_cd.md#setting-up-railway_domain-secret).

### Adding Variables to GitHub

1. **Go to Repository Settings:**
   - Click **Settings** → **Secrets and variables** → **Actions**
   - Click on the **"Variables"** tab

2. **Add Repository Variable:**
   - Click **"New repository variable"**
   - Enter the name (e.g., `HEALTH_CHECK_TIMEOUT`)
   - Enter the value (e.g., `30`)
   - Click **"Add variable"**

3. **Use in Workflow:**
   ```yaml
   env:
     HEALTH_CHECK_TIMEOUT: ${{ vars.HEALTH_CHECK_TIMEOUT || '30' }}
   ```

### Important Notes

- **Secrets are encrypted** - Use for sensitive data (tokens, keys)
- **Variables are not encrypted** - Use for non-sensitive configuration
- **Organization-level secrets/variables** - Can be shared across repos
- **Environment-specific secrets** - Can be scoped to specific environments

---

## Next.js UI (Vercel/Other)

### Local Development

1. **Create/Edit `.env.local` in the `ui/` directory:**
   ```bash
   cd ui
   cp .env.example .env.local
   ```

2. **Edit `.env.local`:**
   ```bash
   # API URL for the Railway backend
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. **Restart the dev server:**
   ```bash
   npm run dev
   ```

### Vercel Deployment

1. **Via Vercel Dashboard:**
   - Go to [vercel.com](https://vercel.com)
   - Select your project
   - Go to **Settings** → **Environment Variables**
   - Click **"Add New"**
   - Enter name: `NEXT_PUBLIC_API_URL`
   - Enter value: Your production API URL (configure via `NEXT_PUBLIC_API_URL` environment variable)
   - Select environments (Production, Preview, Development)
   - Click **"Save"**

2. **Via Vercel CLI:**
   ```bash
   # Install Vercel CLI
   npm install -g vercel

   # Login
   vercel login

   # Link project
   vercel link

   # Add environment variable
   vercel env add NEXT_PUBLIC_API_URL production
   # Enter value when prompted

   # Pull environment variables
   vercel env pull .env.local
   ```

### Important Notes

- **`NEXT_PUBLIC_*` prefix** - Required for client-side access in Next.js
- **Redeploy after changes** - Environment variables require redeployment
- **Different values per environment** - Can set different values for production/preview/development

---

## System Environment Variables

### macOS/Linux

1. **For current session:**
   ```bash
   export YAML_DIFFS_API_URL="https://api-yamly.thepitz.studio"  # Set your production API URL
   export YAML_DIFFS_API_TIMEOUT=60
   ```

2. **Persistent (bash/zsh):**
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   echo 'export YAML_DIFFS_API_URL="https://api-yamly.thepitz.studio"' >> ~/.zshrc  # Set your production API URL
   echo 'export YAML_DIFFS_API_TIMEOUT=60' >> ~/.zshrc

   # Reload shell
   source ~/.zshrc
   ```

3. **System-wide (Linux):**
   ```bash
   # Add to /etc/environment (requires sudo)
   sudo nano /etc/environment
   # Add: YAML_DIFFS_API_URL="https://api-yamly.thepitz.studio"  # Set your production API URL
   ```

### Windows

1. **Via GUI:**
   - Open **System Properties** → **Advanced** → **Environment Variables**
   - Click **"New"** under User or System variables
   - Enter name and value
   - Click **"OK"**

2. **Via PowerShell:**
   ```powershell
   # User-level
   [System.Environment]::SetEnvironmentVariable("YAML_DIFFS_API_URL", "https://api-yamly.thepitz.studio", "User")  # Set your production API URL

   # System-level (requires admin)
   [System.Environment]::SetEnvironmentVariable("YAML_DIFFS_API_URL", "https://api-yamly.thepitz.studio", "Machine")  # Set your production API URL
   ```

3. **Via Command Prompt:**
   ```cmd
   setx YAML_DIFFS_API_URL "https://api-yamly.thepitz.studio"  # Set your production API URL
   ```

### Important Notes

- **System variables** - Available to all processes
- **User variables** - Only for current user
- **Requires restart** - Some applications need restart to pick up changes
- **Precedence** - System variables < User variables < Process variables < .env file

---

## Variable Precedence

When multiple sources define the same variable, the order of precedence is:

1. **Command-line arguments** (highest priority)
2. **Process environment variables** (set in current shell)
3. **`.env` file** (for Python scripts using `python-dotenv`)
4. **System/User environment variables**
5. **Default values in code** (lowest priority)

Example:
```bash
# System variable
export YAML_DIFFS_API_URL="https://system.example.com"

# .env file
YAML_DIFFS_API_URL=https://env.example.com

# Command-line (wins!)
python script.py --api-url https://cli.example.com
```

---

## Common Variables Reference

### API Server Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | Port to bind the server to (Railway sets automatically) |
| `HOST` | `0.0.0.0` | Host to bind to (required for Railway) |
| `LOG_LEVEL` | `INFO` | Logging level: DEBUG, INFO, WARNING, ERROR, CRITICAL |
| `CORS_ORIGINS` | `""` | Comma-separated list of allowed CORS origins |
| `CORS_ALLOW_CREDENTIALS` | `true` | Allow credentials in CORS requests |
| `APP_NAME` | `yamly API` | Application name |
| `APP_VERSION` | `0.1.0` | Application version |

### API Client Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `YAML_DIFFS_API_URL` | `http://localhost:8000` | Base URL for the API |
| `YAML_DIFFS_API_KEY` | `""` | Optional API key for authentication |
| `YAML_DIFFS_API_TIMEOUT` | `30` | Request timeout in seconds |

### UI Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | API URL for the Railway backend |

---

## Troubleshooting

### Variables Not Loading

1. **Check file location:**
   - `.env` should be in project root (same level as `pyproject.toml`)
   - `ui/.env.local` should be in the `ui/` directory

2. **Check file syntax:**
   ```bash
   # No spaces around =
   CORRECT: YAML_DIFFS_API_URL=https://example.com
   WRONG:   YAML_DIFFS_API_URL = https://example.com

   # No quotes needed (unless value has spaces)
   CORRECT: CORS_ORIGINS=http://localhost:3000,http://localhost:5173
   WRONG:   CORS_ORIGINS="http://localhost:3000,http://localhost:5173"
   ```

3. **Restart services:**
   - Python scripts: Restart the process
   - Next.js: Restart dev server (`npm run dev`)
   - Railway: Variables trigger auto-redeploy

### Railway Variables Not Updating

1. **Check deployment status:**
   - Go to Railway dashboard → Deployments
   - Verify latest deployment completed successfully

2. **Verify variable name:**
   - Check for typos (case-sensitive)
   - Ensure no extra spaces

3. **Check service logs:**
   - Railway dashboard → Service → Logs
   - Look for environment variable errors

### Next.js Variables Not Working

1. **Check prefix:**
   - Client-side variables must start with `NEXT_PUBLIC_`
   - Server-side variables don't need prefix

2. **Rebuild application:**
   ```bash
   # Variables are baked in at build time
   npm run build
   ```

3. **Check environment:**
   - Production: Uses production variables
   - Preview: Uses preview variables
   - Development: Uses `.env.local`

---

## Security Best Practices

1. **Never commit secrets:**
   - Use `.gitignore` for `.env` files
   - Use GitHub Secrets for CI/CD
   - Use Railway's encrypted variables

2. **Use specific CORS origins:**
   - Never use `*` in production
   - List specific domains only

3. **Rotate secrets regularly:**
   - Update API keys periodically
   - Revoke old tokens

4. **Limit access:**
   - Only give access to necessary team members
   - Use environment-specific variables

5. **Audit variables:**
   - Review variables periodically
   - Remove unused variables
   - Document purpose of each variable

---

## Additional Resources

- [Railway Environment Variables Documentation](https://docs.railway.app/develop/variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
