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
    snippet: `enum InteractionState {
  case rest
  case hovered
  case pressed
}

component Button <PointerInput>(
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
  } else if interactionState == .pressed {
    opacity = 0.75
  } else {
    opacity = 1
  }

  let text = Text(
    content: label,
    color: #FFFFFF,
    fontSize: 15,
    fontWeight: 600
  )

  children = [text]

  // Host inbound — self. optional / clarifying
  self.hoverStart = { interactionState = .hovered }
  hoverEnd = { interactionState = .rest }
  self.pressStart = { interactionState = .pressed }
  pressEnd = { interactionState = .hovered }
  self.pressCancel = { interactionState = .rest }
}
`,
  },
  {
    id: "host-handlers",
    label: "Host inbound · [self.]channel handlers",
    select: "pressEnd",
    snippet: `  // Paste inside a PointerInput component kind body.
  // Bare and self.-qualified forms are equivalent.
  self.hoverStart = { interactionState = .hovered }
  hoverEnd = { interactionState = .rest }
  self.pressStart = { interactionState = .pressed }
  pressEnd = { interactionState = .hovered }
  self.pressCancel = { interactionState = .rest }
`,
  },
  {
    id: "search-field",
    label: "Component · SearchField (EditableText)",
    select: "SearchField",
    snippet: `protocol FormField: component {
  requires EditableText
  requires PointerInput
  value: String = ""
  placeholder: String = ""
  emits { change(value: String) }
}

component SearchField emits <FormField>(
  value: String = "",
  placeholder: String = "Search",
  editing: Bool = false
) text {
  editable = value
  content = placeholder
  fontSize = 15
  color = #111111
  if editing {
    content = value
    borderColor = #0066FF
    borderWidth = 1
  }

  self.pressEnd = {
    if editing {
    } else {
      editing = true
      beginEditing(value)
    }
  }
  self.keyboardDismissed = {
    editing = false
    emit change(value)
  }
  self.keyboardCancelled = {
    editing = false
    cancelEditing()
  }
}
`,
  },
  {
    id: "host-pointer",
    label: "Component · PointerInput opt-in",
    select: "PointerTarget",
    snippet: `// PointerInput is a language prelude — no import / no protocol decl needed.
enum PointerPhase {
  case rest
  case hovered
}

component PointerTarget <PointerInput>(
  interactionState: PointerPhase = .rest
) layout {
  width = 120
  height = 40
  background = #EEEEEE
  children = []

  if interactionState == .hovered {
    background = #DDDDDD
  }

  self.hoverStart = { interactionState = .hovered }
  hoverEnd = { interactionState = .rest }
}
`,
  },
  {
    id: "filter-bar",
    label: "Component · Filter bar (emits + ForEach)",
    select: "FilterBar",
    snippet: `enum FilterId {
  case all
  case podcasts
}

protocol SubnavItem: component {
  requires PointerInput
  title = ""
  filter: FilterId = .all
  emits {
    select(filter: FilterId)
  }
}

component FilterChip emits <SubnavItem>(
  selected: Bool = false
) layout {
  direction = .row
  padding = EdgeInsets(x: 12, y: 8)
  cornerRadius = 999
  background = #F2F2F4

  if selected {
    background = #222222
  }

  let label = Text(
    content: title,
    fontSize: 13,
    fontWeight: 600,
    color: #111111
  )
  if selected {
    label.color = #FFFFFF
  }
  children = [label]

  self.pressEnd = { emit select(filter) }
}

component FilterBar(
  currentFilter: FilterId = .all,
  chips: [SubnavItem] = [
    FilterChip(title: "All", filter: .all),
    FilterChip(title: "Podcasts", filter: .podcasts)
  ]
) layout {
  direction = .row
  gap = 8
  padding = 12

  ForEach(chips) { chip in
    if self.currentFilter == filter {
      chip.selected = true
    } else {
      chip.selected = false
    }
    chip.select(filter_id: FilterId) = {
      currentFilter = filter_id
    }
  }
  children = chips
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

  let heading = Text(
    content: title,
    color: #111111,
    fontSize: 17,
    fontWeight: 650
  )

  let copy = Text(content: body, color: #555555, fontSize: 14)

  children = [heading, copy]
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

  let primary = Text(
    content: "Primary",
    color: #FFFFFF,
    fontSize: 14,
    fontWeight: 600
  )

  let secondary = Text(content: "Secondary", color: #333333, fontSize: 14)

  children = [primary, secondary]
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
    id: "enum",
    label: "Enum · InteractionState",
    select: "InteractionState",
    snippet: `enum InteractionState {
  case rest
  case hovered
  case pressed
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
    label: "Usage · description on a card",
    select: "NoteCard",
    snippet: `component NoteCard() layout {
  direction = .column
  gap = 8
  padding = 16
  background = #F3F4F6
  cornerRadius = 12
  width = 260

  let title = Text(content: "Usage note", color: #111827, fontSize: 16, fontWeight: 650)
  let body = Text(content: "The grey line under the title is usage.description.", color: #4B5563, fontSize: 13)
  children = [title, body]
}

usage NoteCard {
  description = "A written note for authors. It does not change layout."
}
`,
  },
  {
    id: "rules-primary",
    label: "Rules · one primary action (red)",
    select: "TwoPrimaries",
    snippet: `variant Emphasis {
  case primary
  case secondary
}

component Action(
  label: String = "OK",
  emphasis: Emphasis = .primary
) layout {
  direction = .row
  padding = EdgeInsets(x: 16, y: 10)
  cornerRadius = 8
  background = #2563EB
  if emphasis == .secondary {
    background = #6B7280
  }
  let text = Text(content: label, color: #FFFFFF, fontSize: 14, fontWeight: 600)
  children = [text]
}

rules Action {
  tags = ["button"]
  if emphasis == .primary {
    tags.add("primary-action")
    Rule(.mustNot, siblings.where(tag: "primary-action").count > 0,
      description: "Only one primary button in this layout.")
  }
}

component TwoPrimaries() layout {
  direction = .row
  gap = 12
  let save = Action(label: "Save", emphasis: .primary)
  let ok = Action(label: "OK", emphasis: .primary)
  children = [save, ok]
}

usage TwoPrimaries {
  description = "Both actions are primary — expect two red must-not warnings."
}
`,
  },
  {
    id: "rules-card",
    label: "Rules · empty card (orange)",
    select: "EmptyCard",
    snippet: `component EmptyCard() layout {
  direction = .column
  padding = 16
  background = #F3F4F6
  cornerRadius = 12
  width = 240
  height = 80
  children = []
}

usage EmptyCard {
  description = "A card should not be left empty. Expect an orange should warning."
}

rules EmptyCard {
  tags = ["card"]
  Rule(.should, descendants.exists,
    description: "A card should contain at least one nested instance.")
}
`,
  },
  {
    id: "rules-field",
    label: "Rules · field needs a label (red)",
    select: "MissingLabel",
    snippet: `component FieldLabel(content: String = "Name") text {
  content = content
  color = #374151
  fontSize = 13
  fontWeight = 600
}

rules FieldLabel {
  tags = ["field-label"]
}

component Field(value: String = "") layout {
  padding = EdgeInsets(x: 12, y: 8)
  borderWidth = 1
  borderColor = #D1D5DB
  cornerRadius = 6
  let text = Text(content: value, color: #111827, fontSize: 14)
  children = [text]
}

rules Field {
  tags = ["field"]
  Rule(.must, siblings.where(tag: "field-label").precedes(self),
    description: "A field must have a label sibling before it.")
}

component MissingLabel() layout {
  direction = .column
  width = 260
  let field = Field(value: "Ada Lovelace")
  children = [field]
}

usage MissingLabel {
  description = "No FieldLabel before the field — expect a red must warning."
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
    id: "motion-modal",
    label: "Motion · Appear / dismiss card",
    select: "MotionCard",
    snippet: `component MotionCard <PointerInput>() layout {
  direction = .column
  gap = 8
  padding = 20
  width = 280
  background = #FFFFFF
  cornerRadius = 12

  let title = Text(content: "Hello", color: #111827, fontSize: 16, fontWeight: 600)
  children = [title]

  self.appear = {
    animate = Motion(
      duration: 250, ease: Ease.bezier(0.2, 0, 0, 1),
      pose: Pose(opacity: 0, scale: 0.95, translateY: 8)
    )
  }
  self.dismiss = {
    animate = Motion(
      duration: 180, ease: .in,
      pose: Pose(opacity: 0, scale: 0.95)
    )
  }
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

  let glyph = Icon(
    icon: IconRef(system: .sfSymbols, name: "checkmark"),
    size: 18,
    color: #444444
  )

  let caption = Text(
    content: label,
    color: #222222,
    fontSize: 14
  )

  children = [glyph, caption]
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
