//! Pose overlay fields. Not frame/layout props.
//! Units: opacity / origin 0…1, scale unitless, translate/blur CSS px, rotate degrees.

pub const MOTION_PROP_NAMES: &[&str] = &[
    "opacity",
    "scale",
    "scaleX",
    "scaleY",
    "translateX",
    "translateY",
    "blur",
    "rotate",
    "originX",
    "originY",
];

pub fn is_motion_prop_name(name: &str) -> bool {
    MOTION_PROP_NAMES.contains(&name)
}

/// Site default `play` when the Motion value omitted it.
pub fn default_motion_play(event: &str, has_pose_track: bool) -> Option<&'static str> {
    match event {
        "appear" => Some("toRest"),
        "dismiss" => Some("toPose"),
        "hoverStart" | "pressStart" => {
            if has_pose_track {
                Some("toPose")
            } else {
                None
            }
        }
        "hoverEnd" | "pressEnd" | "pressCancel" => {
            if has_pose_track {
                Some("toRest")
            } else {
                None
            }
        }
        _ => {
            if has_pose_track {
                Some("toRest")
            } else {
                None
            }
        }
    }
}

/// Fill `play` from the handler site when the spec omitted it.
pub fn apply_site_default_play(mut spec: serde_json::Value, event: &str) -> serde_json::Value {
    if let serde_json::Value::Object(o) = &mut spec {
        if !o.contains_key("play") {
            let has_path = o.contains_key("pose") || o.contains_key("keys");
            if let Some(play) = default_motion_play(event, has_path) {
                o.insert("play".into(), serde_json::Value::String(play.to_string()));
            }
        }
    }
    spec
}
