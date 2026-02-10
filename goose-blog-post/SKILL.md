---
name: goose-blog-post
description: Write and publish blog posts for the block/goose open-source project
author: angiejones
version: "1.0"
tags:
  - blog
  - writing
  - goose
  - documentation
  - content
---

# Goose Blog Post

Write blog posts for the [block/goose](https://github.com/block/goose) open-source project blog powered by Docusaurus.

## Prerequisites

- The goose repo must be cloned locally
- Locate the blog directory at `<goose-repo>/documentation/blog/`
- Confirm the `authors.yml` and blog directory exist before proceeding

If the repo is not cloned, clone it:

```bash
gh repo clone block/goose
```

## Workflow

### Step 1: Gather the Blog Post Details

Ask the user for the following (do not assume any of these):

1. **Topic**: What is the blog post about?
2. **Author**: Who is the author? (needs to match a key in `authors.yml`)
3. **Target audience**: Who is this for? (developers, beginners, community, etc.)
4. **Key points**: What are the main things the post should cover?

If the user provides a rough draft, outline, or notes — use those as the foundation.

### Step 2: Verify Author Exists

Check `<goose-repo>/documentation/blog/authors.yml` for the author key.

If the author does **not** exist, create a new entry. The format is:

```yaml
authorkey:
  name: Full Name
  title: Job Title
  image_url: https://avatars.githubusercontent.com/u/<github-id>?v=4
  page: true
  socials:
    github: github-username
    x: x-username
    linkedin: linkedin-username
```

Ask the user for any missing details (name, title, GitHub username, social handles). The `image_url` can be derived from their GitHub profile: `https://avatars.githubusercontent.com/u/<id>?v=4`. Look up their GitHub user ID if needed:

```bash
gh api users/<username> --jq '.id'
```

### Step 3: Create the Blog Post Directory

Blog posts use the naming convention:

```
YYYY-MM-DD-slug-title/
  index.md
```

Rules:
- Use **today's date** (run `date +%Y-%m-%d` to get it)
- The slug should be lowercase, hyphen-separated, concise, and descriptive
- The directory lives inside `<goose-repo>/documentation/blog/`

```bash
mkdir -p documentation/blog/YYYY-MM-DD-slug-title
```

### Step 4: Write the Blog Post

Create `index.md` inside the new directory with this structure:

#### Frontmatter (Required)

```markdown
---
title: "Your Blog Post Title"
description: "A concise summary of the post (1-2 sentences). Used in social previews and SEO."
authors:
  - authorkey
---
```

Frontmatter rules:
- `title` — wrap in quotes, use title case
- `description` — wrap in quotes, keep to 1-2 sentences, make it compelling for social sharing
- `authors` — a YAML list of author keys from `authors.yml` (supports multiple authors)
- Do **not** include a `date` field — Docusaurus extracts the date from the directory name
- Do **not** include `tags` in frontmatter — the blog does not use Docusaurus tags

#### Header Image (Required)

Every post **must** start with a header/banner image immediately after the frontmatter:

```markdown
![blog banner](banner.png)
```

- The image file lives in the same directory as `index.md`
- Use a **1200×600** image
- Supported formats: `.png`, `.jpg`, `.webp`
- Alt text should be descriptive

If the user does not have an image ready, create a placeholder reference and remind them to add one before publishing. You can also offer to generate one if image generation tools are available.

#### Truncate Marker (Required)

Add the truncate marker after the introductory paragraph(s). This controls what appears as the preview on the blog index page:

```markdown
![blog banner](banner.png)

Your compelling introduction paragraph that hooks the reader.

<!--truncate-->

The rest of your post continues here...
```

#### Content Body

Write the post following these guidelines:

**Voice & Style:**
- Write in first person when sharing personal experience, third person for announcements
- Be conversational but technically accurate
- The goose blog audience is developers — respect their intelligence
- Avoid marketing fluff; be genuine and specific
- Use concrete examples and code snippets over abstract explanations
- Short paragraphs (2-4 sentences) for readability

**Structure:**
- Start with a hook — why should the reader care?
- Use `##` for major sections and `###` for subsections
- Do **not** use `#` (h1) in the body — the title from frontmatter is the h1
- Include code blocks with language identifiers (` ```python `, ` ```bash `, etc.)
- Use bullet points and numbered lists to break up dense information
- End with a clear takeaway, call-to-action, or next steps

**Goose-Specific Conventions:**
- Refer to the project as "goose" (lowercase) when referencing the tool
- When linking to goose docs: `https://block.github.io/goose/`
- When linking to the repo: `https://github.com/block/goose`
- When linking to extensions: `https://block.github.io/goose/extensions`
- When referencing MCP, spell out "Model Context Protocol" on first use

**Content Types That Work Well:**
- Tutorials and how-tos ("How I built X with goose")
- Deep dives into features or architecture
- Community spotlights and contributor stories
- Comparisons and thought leadership
- Release announcements and changelogs
- Tips, tricks, and workflow guides

### Step 5: Social Media Image (Optional)

For social sharing previews, add an `image` field to the frontmatter:

```markdown
---
title: "Your Blog Post Title"
description: "A concise summary of the post."
authors:
  - authorkey
image: ./social-banner.png
---
```

This `image` is used for Open Graph / Twitter card previews when the post is shared on social media. It should be the same banner image or a dedicated social-optimized version.

### Step 6: Review Checklist

Before considering the post complete, verify:

- [ ] Directory follows `YYYY-MM-DD-slug-title/` naming convention
- [ ] `index.md` exists in the directory
- [ ] Frontmatter includes `title`, `description`, and `authors`
- [ ] Author key exists in `authors.yml`
- [ ] Banner image is included and referenced after frontmatter
- [ ] `<!--truncate-->` marker is placed after the intro
- [ ] No `#` (h1) headers in the body — only `##` and below
- [ ] Code blocks have language identifiers
- [ ] Links to goose resources use the correct URLs
- [ ] Spelling and grammar are clean
- [ ] Post reads well from start to finish

### Step 7: Preview Locally (Optional)

Tell the user they can preview the post locally. Do **not** run this command directly — it blocks the terminal:

```
cd <goose-repo>/documentation
npm start
```

This starts a local dev server at `http://localhost:3000` with hot reloading.

## Example

Here is a complete minimal blog post:

```markdown
---
title: "Building a Custom MCP Server for Your Team"
description: "A step-by-step guide to creating a Model Context Protocol server that connects goose to your team's internal tools."
authors:
  - ebony
---

![blog banner](banner.png)

If your team has internal tools that aren't covered by existing extensions, building a custom MCP server is easier than you think. In this post, I'll walk through how I built one for our team's deployment pipeline.

<!--truncate-->

## Why Build a Custom MCP Server?

Goose connects to tools through the Model Context Protocol (MCP). While there are hundreds of community extensions available, sometimes your team has unique internal tools that need a custom integration.

## Getting Started

First, scaffold a new MCP server project:

\`\`\`bash
npx create-mcp-server my-server
cd my-server
\`\`\`

## Defining Your Tools

The core of any MCP server is its tool definitions...

## Wrapping Up

Building an MCP server took about an hour and saved our team countless context switches. If you want to learn more, check out the [MCP documentation](https://modelcontextprotocol.io/introduction) and the [goose extensions directory](https://block.github.io/goose/extensions).
```
