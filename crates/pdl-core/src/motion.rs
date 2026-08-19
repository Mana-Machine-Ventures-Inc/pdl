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
