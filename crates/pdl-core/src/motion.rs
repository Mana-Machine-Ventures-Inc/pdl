//! v1 motion overlay props (`from` / `to` snapshots). Not frame/layout props.
//! Units: opacity 0…1, scale unitless, translate/blur CSS px, duration ms.

pub const MOTION_PROP_NAMES: &[&str] = &[
    "opacity",
    "scale",
    "scaleX",
    "scaleY",
    "translateX",
    "translateY",
    "blur",
];

pub fn is_motion_prop_name(name: &str) -> bool {
    MOTION_PROP_NAMES.contains(&name)
}
