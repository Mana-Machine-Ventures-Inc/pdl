//! Canonical JSON for `Rule(…)` queries.
//!
//! Rust port of `src/rulesJson.ts` (`ruleLineToDef`, `ruleQueryToJson`,
//! `strengthToJson`, path/terminal serialisation).

use serde_json::{Map, Value};

use crate::ast::*;
use crate::stable_json::number_value;

fn obj(entries: Vec<(&str, Value)>) -> Value {
    let mut m = Map::new();
    for (k, v) in entries {
        m.insert(k.to_string(), v);
    }
    Value::Object(m)
}

fn nav_axis_str(axis: NavAxis) -> &'static str {
    match axis {
        NavAxis::SelfAxis => "self",
        NavAxis::Parent => "parent",
        NavAxis::Ancestors => "ancestors",
        NavAxis::Descendants => "descendants",
        NavAxis::Siblings => "siblings",
        NavAxis::Children => "children",
    }
}

fn ordering_relation_str(r: OrderingRelation) -> &'static str {
    match r {
        OrderingRelation::Precedes => "precedes",
        OrderingRelation::Follows => "follows",
        OrderingRelation::AdjacentTo => "adjacentTo",
    }
}

fn ordering_ref_str(r: OrderingRef) -> &'static str {
    match r {
        OrderingRef::SelfRef => "self",
    }
}

fn aggregate_op_str(op: AggregateOp) -> &'static str {
    match op {
        AggregateOp::Eq => "eq",
        AggregateOp::Ne => "ne",
        AggregateOp::Gt => "gt",
        AggregateOp::Gte => "gte",
        AggregateOp::Lt => "lt",
        AggregateOp::Lte => "lte",
        AggregateOp::Between => "between",
    }
}

fn children_pick_index_value(index: &ChildrenPickIndex) -> Value {
    match index {
        ChildrenPickIndex::First => Value::String("first".to_string()),
        ChildrenPickIndex::Last => Value::String("last".to_string()),
        ChildrenPickIndex::Index(n) => number_value(*n),
    }
}

fn path_to_json(p: &RulePathExpr) -> Value {
    let steps: Vec<Value> = p
        .steps
        .iter()
        .map(|s| match s {
            RulePathStep::Nav { axis } => obj(vec![
                ("kind", Value::String("nav".to_string())),
                ("axis", Value::String(nav_axis_str(*axis).to_string())),
            ]),
            RulePathStep::ChildrenPick { index } => obj(vec![
                ("kind", Value::String("childrenPick".to_string())),
                ("index", children_pick_index_value(index)),
            ]),
        })
        .collect();
    obj(vec![
        ("kind", Value::String("path".to_string())),
        ("steps", Value::Array(steps)),
    ])
}

fn terminal_to_json(terminal: &RuleChainTerminalParsed) -> Value {
    match terminal {
        RuleChainTerminalParsed::Exists => obj(vec![("kind", Value::String("exists".to_string()))]),
        RuleChainTerminalParsed::Ordering { relation, r#ref } => obj(vec![
            ("kind", Value::String("ordering".to_string())),
            (
                "relation",
                Value::String(ordering_relation_str(*relation).to_string()),
            ),
            ("ref", Value::String(ordering_ref_str(*r#ref).to_string())),
        ]),
        RuleChainTerminalParsed::AggregateCompare {
            op,
            right,
            low,
            high,
        } => {
            let aggregate = obj(vec![("kind", Value::String("count".to_string()))]);
            if matches!(op, AggregateOp::Between) {
                let mut entries = vec![
                    ("kind", Value::String("aggregateCompare".to_string())),
                    ("aggregate", aggregate),
                    ("op", Value::String("between".to_string())),
                ];
                if let Some(l) = low {
                    entries.push(("low", number_value(*l)));
                }
                if let Some(h) = high {
                    entries.push(("high", number_value(*h)));
                }
                obj(entries)
            } else {
                let mut entries = vec![
                    ("kind", Value::String("aggregateCompare".to_string())),
                    ("aggregate", aggregate),
                    ("op", Value::String(aggregate_op_str(*op).to_string())),
                ];
                if let Some(r) = right {
                    entries.push(("right", number_value(*r)));
                }
                obj(entries)
            }
        }
    }
}

/// Serialise a parsed rule query (`chain` or `nodeEq`).
pub fn rule_query_to_json(q: &RuleQueryParsed) -> Value {
    match q {
        RuleQueryParsed::NodeEq { left, right } => obj(vec![
            ("kind", Value::String("nodeEq".to_string())),
            ("left", path_to_json(left)),
            ("right", path_to_json(right)),
        ]),
        RuleQueryParsed::Chain {
            axis,
            where_tags,
            terminal,
        } => {
            let filters: Vec<Value> = where_tags
                .iter()
                .map(|name| {
                    obj(vec![
                        ("kind", Value::String("whereTag".to_string())),
                        ("name", Value::String(name.clone())),
                    ])
                })
                .collect();
            obj(vec![
                ("kind", Value::String("chain".to_string())),
                (
                    "nav",
                    obj(vec![
                        ("kind", Value::String("nav".to_string())),
                        ("axis", Value::String(nav_axis_str(*axis).to_string())),
                    ]),
                ),
                ("filters", Value::Array(filters)),
                ("terminal", terminal_to_json(terminal)),
            ])
        }
    }
}

/// Normalise a rule strength keyword (`must` / `mustNot` / `should` / `shouldNot`).
pub fn strength_to_json(s: &str) -> &'static str {
    let x = s.strip_prefix('.').unwrap_or(s);
    match x {
        "must" => "must",
        "mustNot" => "mustNot",
        "should" => "should",
        "shouldNot" => "shouldNot",
        _ => "should",
    }
}

/// Build the canonical `RuleDefJson` object for one rule line (tier defaults to `static`).
pub fn rule_line_to_def(strength: &str, query: &RuleQueryParsed, description: Option<&str>) -> Value {
    obj(vec![
        ("strength", Value::String(strength_to_json(strength).to_string())),
        ("query", rule_query_to_json(query)),
        (
            "description",
            match description {
                Some(d) => Value::String(d.to_string()),
                None => Value::Null,
            },
        ),
        ("tier", Value::String("static".to_string())),
    ])
}
