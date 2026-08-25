/**
 * Starter design-system pack written by Studio "New project".
 * @param {{ title: string, prefix: string }} opts
 * @returns {Record<string, string>} relative path → file contents
 */
export function buildStarterPack(opts) {
  const title = sanitizeTitle(opts.title || "My Design System");
  const prefix = sanitizePrefix(opts.prefix || slugFromTitle(title) || "ds");

  const foundation = `// ${title} — foundation tokens

primitive ${prefix}.color.canvas: Color = #F4F6F5
primitive ${prefix}.color.elevated: Color = #FFFFFF
primitive ${prefix}.color.brand: Color = #0F6E56
primitive ${prefix}.color.brandHover: Color = #0B5844
primitive ${prefix}.color.brandPressed: Color = #094536
primitive ${prefix}.color.text: Color = #14201C
primitive ${prefix}.color.textMuted: Color = #5C6F67
primitive ${prefix}.color.onBrand: Color = #FFFFFF
primitive ${prefix}.color.border: Color = #D0DBD5
primitive ${prefix}.color.ghostFill: Color = #E7EEEA
primitive ${prefix}.color.ghostHover: Color = #D8E4DE
primitive ${prefix}.color.ghostPressed: Color = #C9D9D1

primitive ${prefix}.space.xs: Distance = 4
primitive ${prefix}.space.sm: Distance = 8
primitive ${prefix}.space.md: Distance = 16
primitive ${prefix}.space.lg: Distance = 24

primitive ${prefix}.radius.sm: Radius = 8
primitive ${prefix}.radius.pill: Radius = 999

semantic ${prefix}.color.surface: Color = ${prefix}.color.elevated
semantic ${prefix}.color.page: Color = ${prefix}.color.canvas
semantic ${prefix}.color.label: Color = ${prefix}.color.text

typeStyle Title {
  fontSize = 20
  fontWeight = 600
  lineHeight = 1.25
}

typeStyle Body {
  fontSize = 14
  fontWeight = 400
  lineHeight = 1.4
}

typeStyle Caption {
  fontSize = 12
  fontWeight = 500
  lineHeight = 1.35
}

theme Dark {
  ${prefix}.color.canvas = #101816
  ${prefix}.color.elevated = #1A2420
  ${prefix}.color.text = #F2F7F4
  ${prefix}.color.textMuted = #9BB0A6
  ${prefix}.color.border = #2C3A34
  ${prefix}.color.ghostFill = #24312C
  ${prefix}.color.ghostHover = #2E3F38
  ${prefix}.color.ghostPressed = #384A42
}
`;

  const button = `import "foundation.pdl"

variant BtnTone {
  case primary
  case secondary
  case ghost
}

variant BtnSize {
  case sm
  case lg
}

variant InteractionState {
  case rest
  case hovered
  case pressed
}

component Button <PointerInput>(
  label: String = "Button",
  tone: BtnTone = .primary,
  size: BtnSize = .sm,
  interactionState: InteractionState = .rest
) layout {
  direction = .row
  justify = .center
  align = .center
  gap = ${prefix}.space.xs
  cornerRadius = ${prefix}.radius.pill
  width = .hug
  height = .hug

  if tone == .primary {
    background = ${prefix}.color.brand
  } else if tone == .secondary {
    background = ${prefix}.color.ghostFill
  } else {
    background = ${prefix}.color.ghostFill
  }

  if size == .sm {
    padding = EdgeInsets(x: 14, y: 8)
  } else {
    padding = EdgeInsets(x: 22, y: 12)
  }

  if interactionState == .hovered {
    if tone == .primary {
      background = ${prefix}.color.brandHover
    } else {
      background = ${prefix}.color.ghostHover
    }
  } else if interactionState == .pressed {
    if tone == .primary {
      background = ${prefix}.color.brandPressed
    } else {
      background = ${prefix}.color.ghostPressed
    }
  }

  let Label = Text(
    content: label,
    style: Body,
    fontWeight: 600
  )

  if tone == .primary {
    Label.color = ${prefix}.color.onBrand
  } else {
    Label.color = ${prefix}.color.label
  }

  children = [Label]

  pressStart = {
    interactionState = .pressed
  }
  pressEnd = {
    interactionState = .rest
  }
  hoverStart = {
    interactionState = .hovered
  }
  hoverEnd = {
    interactionState = .rest
  }
}
`;

  const companions = `fixtures Button {
  example "Primary" {
    label = "Continue"
    tone = .primary
  }
  example "Secondary" {
    label = "Cancel"
    tone = .secondary
  }
  example "Large ghost" {
    label = "Learn more"
    tone = .ghost
    size = .lg
  }
}

usage Button {
  description = "Primary action control. Prefer one primary button per view."
}
`;

  const design = `// ${title} — pack entry

import "foundation.pdl"
import "c_button.pdl"
import "companions.pdl"
`;

  const readme = `# ${title}

Starter PDL design system created by **PDL Studio**.

| File | Role |
|------|------|
| \`design.pdl\` | Pack entry (imports) |
| \`foundation.pdl\` | Tokens, type styles, Dark theme |
| \`c_button.pdl\` | \`Button\` with tone / size / pointer |
| \`companions.pdl\` | Fixtures, usage, rules |

Token prefix: \`${prefix}.*\`

Next steps: add more \`c_*.pdl\` components, then import them from \`design.pdl\`.
`;

  return {
    "design.pdl": design,
    "foundation.pdl": foundation,
    "c_button.pdl": button,
    "companions.pdl": companions,
    "README.md": readme,
  };
}

function sanitizeTitle(s) {
  return String(s).trim().slice(0, 80) || "My Design System";
}

function sanitizePrefix(s) {
  const cleaned = String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "")
    .replace(/^[^a-z]+/, "")
    .slice(0, 24);
  return cleaned || "ds";
}

function slugFromTitle(title) {
  const words = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "ds";
  if (words.length === 1) return words[0].slice(0, 8);
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 8);
}
