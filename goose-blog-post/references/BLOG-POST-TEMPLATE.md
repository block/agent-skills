# Blog Post Template

Use this as the starting template when creating a new blog post.

## Template

```markdown
---
title: "TITLE_HERE"
description: "DESCRIPTION_HERE"
authors:
  - AUTHOR_KEY_HERE
---

![blog banner](banner.png)

INTRO_PARAGRAPH_HERE

<!--truncate-->

## First Section

Content here...

## Second Section

Content here...

## Wrapping Up

Conclusion and call-to-action here...
```

## Author Entry Template

Add to `authors.yml` if the author doesn't exist:

```yaml
authorkey:
  name: Full Name
  title: Job Title
  image_url: https://avatars.githubusercontent.com/u/GITHUB_USER_ID?v=4
  page: true
  socials:
    github: github-username
    x: x-username
    linkedin: linkedin-username
```

## Frontmatter Quick Reference

| Field | Required | Notes |
|-------|----------|-------|
| `title` | Yes | Wrap in quotes, title case |
| `description` | Yes | 1-2 sentences, used for SEO and social previews |
| `authors` | Yes | YAML list of keys from `authors.yml` |
| `image` | No | Path to social sharing image (Open Graph / Twitter card) |
| `date` | No | **Do not include** — derived from directory name |
| `tags` | No | **Do not include** — not used on this blog |

## Directory Naming

```
YYYY-MM-DD-slug-title/
├── index.md
├── banner.png        (1200×600, required)
└── social-banner.png (optional, for OG/Twitter cards)
```

## Key URLs

- Goose docs: https://block.github.io/goose/
- Goose repo: https://github.com/block/goose
- Extensions directory: https://block.github.io/goose/extensions
- MCP docs: https://modelcontextprotocol.io/introduction
