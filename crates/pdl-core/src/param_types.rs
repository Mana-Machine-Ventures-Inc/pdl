//! Built-in component / emit / value-let / token type names (`shared/language-objects.json`).
//! Boolean params use **`Bool`** only — `Boolean` is not a type name.

use crate::ast::{CallCallee, ValueExpr};

/// Built-in scalar / composite / host-enum parameter types.
pub const BUILTIN_PARAM_TYPES: &[&str] = &[
    "Color",
    "Opacity",
    "Distance",
    "Radius",
    "Shadow",
    "Icon",
    "MediaSource",
    "Ratio",
    "FontFamily",
    "Size",
    "Weight",
    "LineHeight",
    "LetterSpacing",
    "Sizing",
    "Duration",
    "Ease",
    "Timing",
    "Pose",
    "Stagger",
    "Motion",
    "PresentationMotion",
    "Effect",
    "Blur",
    "Vibrancy",
    "Ramp",
    "Background",
    "Foreground",
    "EdgeInsets",
    "CornerRadii",
    "GradientStop",
    "Media",
    "String",
    "Number",
    "Bool",
    "Direction",
    "Wrap",
    "Align",
    "Justify",
    "Overflow",
    "BorderPosition",
    "TruncateStyle",
    "ContentMode",
    "AlignSelf",
    "Position",
    "BlurStyle",
    "EffectKind",
];

/// Closed cases for host enum types.
pub fn host_enum_cases(type_name: &str) -> Option<&'static [&'static str]> {
    Some(match unwrap_param_type_name(type_name) {
        "Direction" => &[
            "row",
            "column",
            "rowReverse",
            "columnReverse",
            "stack",
            "reverseStack",
        ],
        "Wrap" => &["nowrap", "wrap"],
        "Align" => &["start", "center", "end", "stretch"],
        "Justify" => &[
            "start",
            "center",
            "end",
            "stretch",
            "spaceBetween",
            "spaceAround",
        ],
        "Overflow" => &["visible", "scroll", "clip"],
        "BorderPosition" => &["inside", "outside"],
        "TruncateStyle" => &["clip", "ellipsis"],
        "ContentMode" => &["cover", "contain", "fill", "scaleDown"],
        "AlignSelf" => &["start", "center", "end", "stretch", "auto"],
        "Position" => &["flow", "absolute"],
        "BlurStyle" => &["standard"],
        "EffectKind" => &["blurSelf", "blurBehind", "glass"],
        _ => return None,
    })
}

pub fn is_host_enum_type(type_name: &str) -> bool {
    host_enum_cases(type_name).is_some()
}

/// Strip `[T]` array sugar → `T`.
pub fn unwrap_param_type_name(type_name: &str) -> &str {
    let t = type_name.trim();
    t.strip_prefix('[')
        .and_then(|s| s.strip_suffix(']'))
        .map(str::trim)
        .unwrap_or(t)
}

pub fn is_builtin_param_type(type_name: &str) -> bool {
    let name = unwrap_param_type_name(type_name);
    BUILTIN_PARAM_TYPES.iter().any(|t| *t == name)
}

pub fn is_bool_param_type(type_name: &str) -> bool {
    unwrap_param_type_name(type_name) == "Bool"
}

/// Infer a value-let type from an RHS when `let name = …` omits `: Type`.
pub fn infer_value_let_type(value: &ValueExpr) -> Option<&'static str> {
    match value {
        ValueExpr::Call { callee, .. } => Some(match callee {
            CallCallee::Color => "Color",
            CallCallee::Ramp => "Ramp",
            CallCallee::Blur => "Blur",
            CallCallee::MediaLayer => "Media",
            CallCallee::Vibrancy => "Vibrancy",
        }),
        ValueExpr::Shadow { .. } => Some("Shadow"),
        ValueExpr::EdgeInsets { .. } => Some("EdgeInsets"),
        ValueExpr::Corner { .. } => Some("CornerRadii"),
        ValueExpr::GradientStop { .. } => Some("GradientStop"),
        ValueExpr::IconFile { .. } | ValueExpr::IconSystem { .. } => Some("Icon"),
        ValueExpr::MediaSourceFile { .. } | ValueExpr::MediaSourceUrl { .. } => Some("MediaSource"),
        ValueExpr::Timing { .. } => Some("Timing"),
        ValueExpr::Pose { .. } => Some("Pose"),
        ValueExpr::Stagger { .. } => Some("Stagger"),
        ValueExpr::Key { .. } => None,
        ValueExpr::Motion { .. } => Some("Motion"),
        ValueExpr::PresentationMotion { .. } => Some("PresentationMotion"),
        ValueExpr::Effect { .. } => Some("Effect"),
        ValueExpr::RampInline { .. } => Some("Ramp"),
        ValueExpr::Hex { .. } | ValueExpr::OpacityOf { .. } => Some("Color"),
        ValueExpr::Sizing { .. } => Some("Sizing"),
        ValueExpr::String { .. } => Some("String"),
        ValueExpr::Number { .. } => Some("Number"),
        ValueExpr::Boolean { .. } | ValueExpr::Not { .. } => Some("Bool"),
        _ => None,
    }
}
