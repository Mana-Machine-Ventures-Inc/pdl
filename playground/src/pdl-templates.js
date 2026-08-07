/**
 * Stub PDL blocks for the Playground "Insert template" menu.
 * Snippets use hex colors so they bake without a design-system import.
 */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   snippet: string,
 *   select?: string,
 * }} PdlTemplate
 */

/** @type {PdlTemplate[]} */
export const PDL_TEMPLATES = [
  {
    id: "button",
    label: "Component · Button",
    select: "Button",
    snippet: `variant InteractionState {
  case rest
  case hovered
}

component Button(
  label: String = "Button",
  interactionState: InteractionState = .rest
) layout {
  direction = .row
  align = .center
  justify = .center
  gap = 8
  padding = EdgeInsets(x: 16, y: 10)
  background = #FF5A5F
  cornerRadius = 8
  width = .hug
  height = .hug

  if interactionState == .hovered {
    opacity = 0.88
  } else {
    opacity = 1
  }

  let Label: text = {
    content = label
    color = #FFFFFF
    fontSize = 15
    fontWeight = 600
  }

  children = [Label]
}
`,
  },
  {
    id: "interaction-hover",
    label: "Interaction · Hover (Button)",
    select: "ButtonHover",
    snippet: `interaction ButtonHover for Button {
  on hoverStart {
    interactionState = .hovered
  }
  on hoverEnd {
    interactionState = .rest
  }
}
`,
  },
  {
    id: "text-label",
    label: "Component · Text label",
    select: "Label",
    snippet: `component Label(
  content: String = "Label"
) text {
  content = content
  color = #222222
  fontSize = 14
  fontWeight = 500
}
`,
  },
  {
    id: "card",
    label: "Component · Card stack",
    select: "Card",
    snippet: `component Card(
  title: String = "Title",
  body: String = "Supporting copy."
) layout {
  direction = .column
  align = .stretch
  gap = 8
  padding = 16
  background = #F7F7F8
  cornerRadius = 12
  width = .fill

  let Title: text = {
    content = title
    color = #111111
    fontSize = 17
    fontWeight = 650
  }

  let Body: text = {
    content = body
    color = #555555
    fontSize = 14
  }

  children = [Title, Body]
}
`,
  },
  {
    id: "row",
    label: "Component · Horizontal row",
    select: "ActionRow",
    snippet: `component ActionRow() layout {
  direction = .row
  align = .center
  justify = .start
  gap = 12
  width = .fill

  let Primary: text = {
    content = "Primary"
    color = #FFFFFF
    fontSize = 14
    fontWeight = 600
  }

  let Secondary: text = {
    content = "Secondary"
    color = #333333
    fontSize = 14
  }

  children = [Primary, Secondary]
}
`,
  },
  {
    id: "variant",
    label: "Variant · Tone",
    select: "Tone",
    snippet: `variant Tone {
  case neutral
  case accent
  case danger
}
`,
  },
  {
    id: "tokens",
    label: "Tokens · color primitive + semantic",
    select: "brandPrimary",
    snippet: `primitive atoms.color.brandPrimary: Color = #FF5A5F
primitive atoms.color.surface: Color = #F2F2F4
primitive atoms.color.onBrand: Color = #FFFFFF

semantic atoms.color.buttonFill: Color = atoms.color.brandPrimary
semantic atoms.color.pageBg: Color = atoms.color.surface
`,
  },
  {
    id: "if-variant",
    label: "Layout · if / else on variant",
    select: "tone",
    snippet: `  if tone == .accent {
    background = #FF5A5F
  } else if tone == .danger {
    background = #D93025
  } else {
    background = #EEEEEE
  }
`,
  },
  {
    id: "fixtures",
    label: "Fixtures · examples",
    select: "Button",
    snippet: `fixtures Button {
  example "Default" {
    label = "Save"
  }
  example "Hovered" {
    label = "Save"
    interactionState = .hovered
  }
}
`,
  },
  {
    id: "usage",
    label: "Usage · description",
    select: "Button",
    snippet: `usage Button {
  description = "Primary action control."
}
`,
  },
  {
    id: "extend",
    label: "Extend · companion metadata",
    select: "Button",
    snippet: `extend Button {
  usage {
    description += " Extended via extend."
  }
  fixtures {
    example "Alt" {
      label = "Continue"
    }
  }
}
`,
  },
  {
    id: "import",
    label: "Import · relative module",
    select: "./module.pdl",
    snippet: `import "./module.pdl"
`,
  },
  {
    id: "typestyle",
    label: "TypeStyle · Body",
    select: "Body",
    snippet: `typeStyle Body {
  fontSize = 15
  fontWeight = 400
  color = #222222
}
`,
  },
  {
    id: "icon-row",
    label: "Component · Icon + label row",
    select: "IconLabel",
    snippet: `component IconLabel(
  label: String = "Item"
) layout {
  direction = .row
  align = .center
  gap = 8
  padding = EdgeInsets(x: 10, y: 6)

  let Glyph: icon = {
    icon = "check"
    size = 18
    color = #444444
  }

  let Caption: text = {
    content = label
    color = #222222
    fontSize = 14
  }

  children = [Glyph, Caption]
}
`,
  },
];

/**
 * Insert a multi-line template at the cursor.
 * @param {string} doc
 * @param {number} pos
 * @param {string} snippet
 * @returns {{ from: number, to: number, insert: string }}
 */
export function formatTemplateInsert(doc, pos, snippet) {
  const text = snippet.replace(/\s+$/, "") + "\n";
  if (pos <= 0) {
    return { from: 0, to: 0, insert: text };
  }
  const before = doc.slice(Math.max(0, pos - 2), pos);
  let prefix = "";
  if (!before.endsWith("\n")) prefix = "\n\n";
  else if (!before.endsWith("\n\n") && pos > 1 && doc[pos - 2] !== "\n") prefix = "\n";
  return { from: pos, to: pos, insert: prefix + text };
}
