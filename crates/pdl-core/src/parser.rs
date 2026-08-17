//! Recursive-descent parser for PDL modules.
//!
//! Faithful Rust port of `src/parser.ts`. Produces the [`crate::ast`] tree from
//! a token stream emitted by [`crate::lexer`].
//!
//! ## TokenKind naming contract (for the lexer author)
//!
//! This parser assumes `crate::lexer::TokenKind` is a **fieldless** (C-like)
//! enum — every token's textual payload lives on `Token::value`, never on the
//! kind. The variant names expected here are:
//!
//! * Literals / atoms: `Ident`, `DotEnum`, `StringLit`, `Number`, `HexColor`.
//! * End of input: `Eof`.
//! * Keywords (PascalCase of the TS spelling): `Import`, `PreviewBackground`,
//!   `Primitive`, `Semantic`, `Theme`, `TypeStyle`, `Variant`, `Protocol`,
//!   `Component`, `Interaction`, `Expose`, `Fixtures`, `Usage`, `Rules`,
//!   `Extend`, `Let`,
//!   `If`, `Else`, `On`, `For`, `True`, `False`, `Case`, `Example`, `Rule`,
//!   `Description`, `Animate`, `Where`,
//!   `Tags`, and the type/call keywords `EdgeInsets`, `Corner`, `GradientStop`,
//!   `Color`, `Opacity`, `Distance`, `Radius`, `Shadow`, `Icon`, `MediaSource`,
//!   `Ratio`, `FontFamily`, `Size`, `Weight`, `LineHeight`, `LetterSpacing`,
//!   `Sizing`, `Duration`, `Easing`,
//!   `Transition`, `Pose`, `Stagger`, `Motion`, `Ramp`, `Blur`, `Media`, `Vibrancy`, `Background`,
//!   `Foreground`.
//! * The `self` keyword is spelled **`SelfKw`** (Rust reserves `Self`/`self`).
//! * Punctuation: `LBrace` `{`, `RBrace` `}`, `LParen` `(`, `RParen` `)`,
//!   `LBracket` `[`, `RBracket` `]`, `Eq` `=`, `EqEq` `==`, `Ne` `!=`,
//!   `Colon` `:`, `Comma` `,`, `PlusEq` `+=`, `AndAnd` `&&`, `OrOr` `||`,
//!   `At` `@`, `Gt` `>`, `Ge` `>=`, `Lt` `<`, `Le` `<=`, `Dot` `.`.
//!
//! Frame kinds (`layout|text|icon|media`) are ordinary `Ident` values, **not**
//! keywords.

use crate::ast::*;
use crate::error::PdlError;
use crate::frame_props::looks_like_qualified_enum_type_name;
use crate::lexer::{tokenize, Token, TokenKind};
use crate::motion::{is_motion_prop_name, MOTION_PROP_NAMES};
use crate::param_types::infer_value_let_type;
use crate::world_a::{
    frame_ctor_kwargs_to_body, frame_ctor_to_kind, is_frame_ctor_name, lower_world_a_body,
    RESERVED_FRAME_CTOR_COMPONENT_NAMES,
};

#[derive(Default)]
struct PresenterVerbArgs {
    page: Option<ValueExpr>,
    style: Option<String>,
    move_spec: Option<ValueExpr>,
    dismiss_move: Option<ValueExpr>,
}

pub struct Parser {
    tokens: Vec<Token>,
    index: usize,
    file_path: String,
    eof: Token,
}

impl Parser {
    pub fn new(tokens: Vec<Token>, file_path: String) -> Self {
        let eof = Token {
            kind: TokenKind::Eof,
            value: String::new(),
            line: 1,
            column: 1,
        };
        Self {
            tokens,
            index: 0,
            file_path,
            eof,
        }
    }

    pub fn parse_module(&mut self) -> Result<ModuleAst, PdlError> {
        let mut declarations: Vec<TopLevelDecl> = Vec::new();
        while !self.is(TokenKind::Eof) {
            let decl = self.parse_top_level()?;
            if let TopLevelDecl::Component(mut c) = decl {
                let name = c.name.clone();
                let host_handlers = extract_host_handlers(&mut c.body);
                declarations.push(TopLevelDecl::Component(c));
                if !host_handlers.is_empty() {
                    declarations.push(TopLevelDecl::Interaction(InteractionDecl {
                        name: "default".to_string(),
                        component: name.clone(),
                        handlers: host_handlers,
                    }));
                }
                // Trailing `} emits <P>` / `} emits { … }` after the component.
                // Not `emits(propagation: …) Name { … }` — that is a top-level emits-decl.
                if self.is_trailing_emits() {
                    let (more_protos, inline) = self.parse_trailing_emits(name.clone())?;
                    if let Some(c) = declarations.iter_mut().rev().find_map(|d| match d {
                        TopLevelDecl::Component(c) if c.name == name => Some(c),
                        _ => None,
                    }) {
                        for p in more_protos {
                            if c.emits_protocols.iter().any(|e| e == &p) {
                                return Err(self.err_code(
                                    "PDL-E043",
                                    format!(
                                        "Component `{name}` lists protocol `{p}` more than once"
                                    ),
                                ));
                            }
                            c.emits_protocols.push(p);
                        }
                    }
                    if let Some(emits) = inline {
                        declarations.push(TopLevelDecl::Emits(emits));
                    }
                }
                if self.is(TokenKind::Interaction) {
                    return Err(self.err_interaction_removed());
                }
            } else {
                declarations.push(decl);
            }
        }
        Ok(ModuleAst {
            path: self.file_path.clone(),
            declarations,
        })
    }

    fn parse_top_level(&mut self) -> Result<TopLevelDecl, PdlError> {
        let kind = self.peek().kind;
        match kind {
            TokenKind::Import => Ok(TopLevelDecl::Import(self.parse_import()?)),
            TokenKind::PreviewBackground => {
                Ok(TopLevelDecl::PreviewBackground(self.parse_preview_background()?))
            }
            TokenKind::Primitive => Ok(TopLevelDecl::Primitive(self.parse_primitive()?)),
            TokenKind::Semantic => Ok(TopLevelDecl::Semantic(self.parse_semantic()?)),
            TokenKind::Theme => Ok(TopLevelDecl::Theme(self.parse_theme()?)),
            TokenKind::Catalog => Ok(TopLevelDecl::Catalog(self.parse_catalog()?)),
            TokenKind::Host => Ok(TopLevelDecl::Host(self.parse_host_profile()?)),
            TokenKind::TypeStyle => Ok(TopLevelDecl::TypeStyle(self.parse_type_style()?)),
            TokenKind::Variant => Ok(TopLevelDecl::Variant(self.parse_variant()?)),
            TokenKind::Protocol => Ok(TopLevelDecl::Protocol(self.parse_protocol()?)),
            TokenKind::Component => Ok(TopLevelDecl::Component(self.parse_component()?)),
            TokenKind::Ident if self.peek().value == "page" => Ok(TopLevelDecl::Component(
                self.parse_component_like(ComponentRole::Page)?,
            )),
            TokenKind::Ident if self.peek().value == "screen" => Ok(TopLevelDecl::Component(
                self.parse_component_like(ComponentRole::Screen)?,
            )),
            TokenKind::Expose => Err(self.err_code(
                "PDL-E001",
                "`expose` was removed from PDL; all component parameters are public (use `emits` for output)",
            )),
            TokenKind::Interaction => Err(self.err_interaction_removed()),
            TokenKind::Emits => Ok(TopLevelDecl::Emits(self.parse_emits_decl()?)),
            TokenKind::Fixtures => Ok(TopLevelDecl::Fixtures(self.parse_fixtures()?)),
            TokenKind::Samples => Ok(TopLevelDecl::Samples(self.parse_samples()?)),
            TokenKind::Usage => Ok(TopLevelDecl::Usage(self.parse_usage()?)),
            TokenKind::Rules => Ok(TopLevelDecl::Rules(self.parse_rules()?)),
            TokenKind::Extend => Ok(TopLevelDecl::Extend(self.parse_extend()?)),
            TokenKind::Use => Err(self.err_use_outside_mount()),
            other => Err(self.err(format!("Unexpected token {:?} at top level", other))),
        }
    }

    fn parse_import(&mut self) -> Result<ImportDecl, PdlError> {
        self.consume(TokenKind::Import)?;
        let p = self.consume(TokenKind::StringLit)?;
        Ok(ImportDecl { path: p.value })
    }

    fn parse_preview_background(&mut self) -> Result<PreviewBackgroundDecl, PdlError> {
        self.consume(TokenKind::PreviewBackground)?;
        let token = self.parse_qualified_name()?;
        Ok(PreviewBackgroundDecl { token })
    }

    /// Dotted token paths (`color.surface.primary`) and other qualified names.
    fn parse_qualified_name(&mut self) -> Result<String, PdlError> {
        let first = self.consume(TokenKind::Ident)?.value;
        self.finish_qualified_name(first)
    }

    fn finish_qualified_name(&mut self, first: String) -> Result<String, PdlError> {
        let mut n = first;
        while self.is(TokenKind::Dot) {
            self.consume(TokenKind::Dot)?;
            n.push('.');
            n.push_str(&self.consume(TokenKind::Ident)?.value);
        }
        Ok(n)
    }

    /// Parameter types may use keyword spellings (`Icon`, `Color`, …).
    fn consume_param_type_name(&mut self) -> Result<String, PdlError> {
        let t = self.peek().clone();
        if t.kind == TokenKind::Ident {
            if matches!(t.value.as_str(), "page" | "screen") {
                return Err(self.err_code(
                    "PDL-E039",
                    "Parameter type must be `Page` (prelude protocol), not the `page` / `screen` keyword",
                ));
            }
            return Ok(self.consume(TokenKind::Ident)?.value);
        }
        if is_type_keyword(t.kind) {
            return Ok(self.advance().value);
        }
        Err(self.err(format!("Expected parameter type name, got {:?}", t.kind)))
    }

    /// `Type` or `[Type]` (array / slot list).
    fn parse_param_type(&mut self) -> Result<(String, bool), PdlError> {
        if self.is(TokenKind::LBracket) {
            self.advance();
            let element = self.consume_param_type_name()?;
            self.consume(TokenKind::RBracket)?;
            return Ok((element, true));
        }
        Ok((self.consume_param_type_name()?, false))
    }

    fn consume_token_type_name(&mut self) -> Result<String, PdlError> {
        let t = self.peek().clone();
        if t.kind == TokenKind::Ident {
            return Ok(self.consume(TokenKind::Ident)?.value);
        }
        if is_type_keyword(t.kind) {
            return Ok(self.advance().value);
        }
        Err(self.err(format!("Expected token type name, got {:?}", t.kind)))
    }

    fn parse_primitive(&mut self) -> Result<PrimitiveDecl, PdlError> {
        self.consume(TokenKind::Primitive)?;
        let name = self.parse_qualified_name()?;
        self.consume(TokenKind::Colon)?;
        let token_type = self.consume_token_type_name()?;
        self.consume(TokenKind::Eq)?;
        let value = self.parse_value_expr()?;
        Ok(PrimitiveDecl {
            name,
            token_type,
            value,
        })
    }

    fn parse_semantic(&mut self) -> Result<SemanticDecl, PdlError> {
        self.consume(TokenKind::Semantic)?;
        let name = self.parse_qualified_name()?;
        self.consume(TokenKind::Colon)?;
        let token_type = self.consume_token_type_name()?;
        self.consume(TokenKind::Eq)?;
        let value = self.parse_value_expr()?;
        Ok(SemanticDecl {
            name,
            token_type,
            value,
        })
    }

    fn parse_theme(&mut self) -> Result<ThemeDecl, PdlError> {
        self.consume(TokenKind::Theme)?;
        let name = self.consume(TokenKind::Ident)?.value;
        let mut base_theme: Option<String> = None;
        if self.is(TokenKind::Colon) {
            self.consume(TokenKind::Colon)?;
            base_theme = Some(self.consume(TokenKind::Ident)?.value);
        }
        self.consume(TokenKind::LBrace)?;
        let mut overrides: indexmap::IndexMap<String, ValueExpr> = indexmap::IndexMap::new();
        while !self.is(TokenKind::RBrace) {
            let key = self.parse_qualified_name()?;
            self.consume(TokenKind::Eq)?;
            let value = self.parse_value_expr()?;
            overrides.insert(key, value);
        }
        self.consume(TokenKind::RBrace)?;
        Ok(ThemeDecl {
            name,
            base_theme,
            overrides,
        })
    }

    fn parse_catalog(&mut self) -> Result<CatalogDecl, PdlError> {
        self.consume(TokenKind::Catalog)?;
        let name = self.consume(TokenKind::Ident)?.value;
        self.consume(TokenKind::LBrace)?;
        let mut overrides: indexmap::IndexMap<String, ValueExpr> = indexmap::IndexMap::new();
        while !self.is(TokenKind::RBrace) {
            let key = self.parse_qualified_name()?;
            self.consume(TokenKind::Eq)?;
            let value = self.parse_value_expr()?;
            overrides.insert(key, value);
        }
        self.consume(TokenKind::RBrace)?;
        Ok(CatalogDecl { name, overrides })
    }

    fn parse_host_profile(&mut self) -> Result<HostDecl, PdlError> {
        self.consume(TokenKind::Host)?;
        let name = self.consume(TokenKind::Ident)?.value;
        self.consume(TokenKind::LParen)?;
        let mut params: Vec<ComponentParam> = Vec::new();
        if !self.is(TokenKind::RParen) {
            loop {
                let pname = self.consume_param_name()?;
                self.consume(TokenKind::Colon)?;
                let (type_name, is_array) = self.parse_param_type()?;
                self.consume(TokenKind::Eq)?;
                let default_value = self.parse_value_expr()?;
                params.push(ComponentParam {
                    name: pname,
                    type_name,
                    is_array,
                    default_value,
                });
                if self.is(TokenKind::RParen) {
                    break;
                }
                self.consume(TokenKind::Comma)?;
                if self.is(TokenKind::RParen) {
                    break;
                }
            }
        }
        self.consume(TokenKind::RParen)?;
        let mount = if self.is(TokenKind::Mount) {
            self.advance();
            Some(self.parse_mount_body()?)
        } else {
            None
        };
        Ok(HostDecl {
            name,
            params,
            mount,
        })
    }

    fn parse_mount_body(&mut self) -> Result<Vec<MountItem>, PdlError> {
        self.consume(TokenKind::LBrace)?;
        let mut items = Vec::new();
        while !self.is(TokenKind::RBrace) {
            items.push(self.parse_mount_item()?);
        }
        self.consume(TokenKind::RBrace)?;
        Ok(items)
    }

    fn parse_mount_item(&mut self) -> Result<MountItem, PdlError> {
        if self.is(TokenKind::Let) {
            return self.parse_mount_let();
        }
        if self.is(TokenKind::If) {
            return self.parse_mount_if();
        }
        if self.is(TokenKind::SelfKw) {
            return self.parse_mount_assign();
        }
        if self.is(TokenKind::Use) {
            return self.parse_mount_use_catalog();
        }
        if self.is(TokenKind::Ident) && self.peek_ahead_kind(1) == TokenKind::Dot
            || (self.is(TokenKind::Ident) && self.peek_ahead_kind(1) == TokenKind::Eq)
        {
            return self.parse_mount_token_assign();
        }
        Err(self
            .err("Expected `let`, `self.param =`, `use catalog`, token assign, or `if` in `mount`"))
    }

    fn parse_mount_use_catalog(&mut self) -> Result<MountItem, PdlError> {
        self.consume(TokenKind::Use)?;
        if !self.is(TokenKind::Catalog) {
            return Err(self.err_code(
                "PDL-E049",
                "`use` in `mount` must be `use catalog Name` (user themes are `--theme`, not `use theme`)",
            ));
        }
        self.advance();
        let name = self.consume(TokenKind::Ident)?.value;
        Ok(MountItem::UseCatalog { name })
    }

    fn parse_mount_token_assign(&mut self) -> Result<MountItem, PdlError> {
        let name = self.parse_qualified_name()?;
        self.consume(TokenKind::Eq)?;
        let value = self.parse_mount_expr()?;
        Ok(MountItem::TokenAssign { name, value })
    }

    fn parse_mount_let(&mut self) -> Result<MountItem, PdlError> {
        self.consume(TokenKind::Let)?;
        let name = self.consume(TokenKind::Ident)?.value;
        self.consume(TokenKind::Colon)?;
        let type_name = self.consume_param_type_name()?;
        self.consume(TokenKind::Eq)?;
        let value = self.parse_mount_expr()?;
        Ok(MountItem::Let {
            name,
            type_name,
            value,
        })
    }

    fn parse_mount_assign(&mut self) -> Result<MountItem, PdlError> {
        self.consume(TokenKind::SelfKw)?;
        self.consume(TokenKind::Dot)?;
        let param = self.consume_param_name()?;
        self.consume(TokenKind::Eq)?;
        let value = self.parse_mount_expr()?;
        Ok(MountItem::Assign { param, value })
    }

    fn parse_mount_if(&mut self) -> Result<MountItem, PdlError> {
        self.consume(TokenKind::If)?;
        let condition = self.parse_mount_cond_or()?;
        let then_items = self.parse_mount_body()?;
        let mut else_if = Vec::new();
        let mut else_items = None;
        while self.is(TokenKind::Else) {
            self.advance();
            if self.is(TokenKind::If) {
                self.advance();
                let cond = self.parse_mount_cond_or()?;
                let body = self.parse_mount_body()?;
                else_if.push((cond, body));
            } else {
                else_items = Some(self.parse_mount_body()?);
                break;
            }
        }
        Ok(MountItem::If {
            chain: MountIfChain {
                condition,
                then_items,
                else_if,
                else_items,
            },
        })
    }

    fn parse_mount_expr(&mut self) -> Result<MountExpr, PdlError> {
        let first = self.parse_mount_arm()?;
        if !self.is(TokenKind::QuestionQuestion) {
            return Ok(first);
        }
        let mut arms = vec![first];
        while self.is(TokenKind::QuestionQuestion) {
            self.advance();
            arms.push(self.parse_mount_arm()?);
        }
        Ok(MountExpr::Coalesce { arms })
    }

    fn parse_mount_arm(&mut self) -> Result<MountExpr, PdlError> {
        if self.is(TokenKind::Host) && self.peek_ahead_kind(1) == TokenKind::LBracket {
            return self.parse_mount_host_probe();
        }
        if self.is(TokenKind::QuestionQuestion) {
            return Err(self.err_code("PDL-E047", "`??` is only valid in a `mount` coalesce chain"));
        }
        Ok(MountExpr::Value(self.parse_primary_value()?))
    }

    fn parse_mount_host_probe(&mut self) -> Result<MountExpr, PdlError> {
        self.consume(TokenKind::Host)?;
        self.consume(TokenKind::LBracket)?;
        let key = self.consume(TokenKind::StringLit)?.value;
        self.consume(TokenKind::RBracket)?;
        self.consume(TokenKind::As)?;
        let soft = if self.is(TokenKind::Question) {
            self.advance();
            true
        } else {
            false
        };
        let type_name = self.consume_param_type_name()?;
        Ok(MountExpr::HostProbe {
            key,
            type_name,
            soft,
        })
    }

    fn parse_mount_cond_or(&mut self) -> Result<MountCondition, PdlError> {
        let first = self.parse_mount_cond_and()?;
        if !self.is(TokenKind::OrOr) {
            return Ok(first);
        }
        let mut items = vec![first];
        while self.is(TokenKind::OrOr) {
            self.advance();
            items.push(self.parse_mount_cond_and()?);
        }
        Ok(MountCondition::Or { items })
    }

    fn parse_mount_cond_and(&mut self) -> Result<MountCondition, PdlError> {
        let first = self.parse_mount_cond_cmp()?;
        if !self.is(TokenKind::AndAnd) {
            return Ok(first);
        }
        let mut items = vec![first];
        while self.is(TokenKind::AndAnd) {
            self.advance();
            items.push(self.parse_mount_cond_cmp()?);
        }
        Ok(MountCondition::And { items })
    }

    fn parse_mount_cond_cmp(&mut self) -> Result<MountCondition, PdlError> {
        let left = self.parse_mount_expr()?;
        let op = if self.is(TokenKind::EqEq) {
            self.advance();
            Some(MountCmpOp::Eq)
        } else if self.is(TokenKind::Ne) {
            self.advance();
            Some(MountCmpOp::Ne)
        } else if self.is(TokenKind::Lt) {
            self.advance();
            Some(MountCmpOp::Lt)
        } else if self.is(TokenKind::Le) {
            self.advance();
            Some(MountCmpOp::Le)
        } else if self.is(TokenKind::Gt) {
            self.advance();
            Some(MountCmpOp::Gt)
        } else if self.is(TokenKind::Ge) {
            self.advance();
            Some(MountCmpOp::Ge)
        } else {
            None
        };
        match op {
            Some(op) => {
                let right = self.parse_mount_expr()?;
                Ok(MountCondition::Cmp { left, op, right })
            }
            None => Ok(MountCondition::Truthy { expr: left }),
        }
    }

    fn parse_type_style(&mut self) -> Result<TypeStyleDecl, PdlError> {
        self.consume(TokenKind::TypeStyle)?;
        let name = self.consume(TokenKind::Ident)?.value;
        self.consume(TokenKind::LBrace)?;
        let mut props: indexmap::IndexMap<String, ValueExpr> = indexmap::IndexMap::new();
        while !self.is(TokenKind::RBrace) {
            let k = self.consume(TokenKind::Ident)?.value;
            self.consume(TokenKind::Eq)?;
            let value = self.parse_value_expr()?;
            props.insert(k, value);
        }
        self.consume(TokenKind::RBrace)?;
        Ok(TypeStyleDecl { name, props })
    }

    fn parse_variant(&mut self) -> Result<VariantDecl, PdlError> {
        self.consume(TokenKind::Variant)?;
        let name = self.consume(TokenKind::Ident)?.value;
        self.consume(TokenKind::LBrace)?;
        let mut cases: Vec<String> = Vec::new();
        while !self.is(TokenKind::RBrace) {
            self.consume(TokenKind::Case)?;
            cases.push(self.consume(TokenKind::Ident)?.value);
        }
        self.consume(TokenKind::RBrace)?;
        Ok(VariantDecl { name, cases })
    }

    fn err_interaction_removed(&self) -> PdlError {
        self.err_code(
            "PDL-E001",
            "`interaction` blocks were removed; wire host channels with \
             `[self.]<channel> = { … }` in the component kind body (§4a′ / §8)",
        )
    }

    /// `emits` `[ (propagation: .parent | .ancestors) ]` — omitted means `.parent`.
    fn parse_emits_propagation(&mut self) -> Result<EmitPropagation, PdlError> {
        if !self.is(TokenKind::LParen) {
            return Ok(EmitPropagation::Parent);
        }
        self.advance();
        let key = self.consume(TokenKind::Ident)?;
        if key.value != "propagation" {
            return Err(self.err_code(
                "PDL-E051",
                format!(
                    "Unknown emits argument `{}` (expected `propagation`)",
                    key.value
                ),
            ));
        }
        self.consume(TokenKind::Colon)?;
        if !self.is(TokenKind::DotEnum) {
            return Err(self.err_code(
                "PDL-E051",
                "emits(propagation:) expected `.parent` or `.ancestors`".to_string(),
            ));
        }
        let raw = self.advance().value;
        let case = raw.strip_prefix('.').unwrap_or(raw.as_str());
        let propagation = match case {
            "parent" => EmitPropagation::Parent,
            "ancestors" => EmitPropagation::Ancestors,
            _ => {
                return Err(self.err_code(
                    "PDL-E051",
                    format!(
                        "Unknown emit propagation `{raw}` (expected `.parent` or `.ancestors`)"
                    ),
                ));
            }
        };
        self.consume(TokenKind::RParen)?;
        Ok(propagation)
    }

    /// `emits <P, Q>` send-protocol list (header or trailing).
    fn parse_emits_protocol_list(&mut self, component: &str) -> Result<Vec<String>, PdlError> {
        self.parse_protocol_header_list(component)
    }

    /// ` <P, Q> ` after `component Name` (receive) or `emits` (send).
    fn parse_protocol_header_list(&mut self, component: &str) -> Result<Vec<String>, PdlError> {
        self.consume(TokenKind::Lt)?;
        let mut protos: Vec<String> = Vec::new();
        loop {
            let proto = self.consume(TokenKind::Ident)?.value;
            if protos.iter().any(|p| p == &proto) {
                return Err(self.err_code(
                    "PDL-E043",
                    format!("Component `{component}` lists protocol `{proto}` more than once"),
                ));
            }
            protos.push(proto);
            if self.is(TokenKind::Comma) {
                self.advance();
                if self.is(TokenKind::Gt) {
                    self.advance();
                    break;
                }
                continue;
            }
            self.consume(TokenKind::Gt)?;
            break;
        }
        Ok(protos)
    }

    /// Trailing `emits <P>` and/or `emits { select(…) }`.
    fn parse_trailing_emits(
        &mut self,
        component: String,
    ) -> Result<(Vec<String>, Option<EmitsDecl>), PdlError> {
        self.consume(TokenKind::Emits)?;
        let mut protos = Vec::new();
        if self.is(TokenKind::Lt) {
            protos = self.parse_emits_protocol_list(&component)?;
        }
        let propagation = self.parse_emits_propagation()?;
        if self.is(TokenKind::LBrace) {
            self.advance();
            let emits = self.parse_emits_list_body(propagation)?;
            self.consume(TokenKind::RBrace)?;
            return Ok((protos, Some(EmitsDecl { component, emits })));
        }
        if protos.is_empty() {
            return Err(self
                .err("Expected `emits <Protocol>` or `emits { channel(…) }` after the component"));
        }
        Ok((protos, None))
    }

    fn parse_emits_list_body(
        &mut self,
        propagation: EmitPropagation,
    ) -> Result<Vec<ProtocolEmitDecl>, PdlError> {
        let mut emits = Vec::new();
        while !self.is(TokenKind::RBrace) {
            let name = self.consume(TokenKind::Ident)?.value;
            self.consume(TokenKind::LParen)?;
            let mut args = Vec::new();
            if !self.is(TokenKind::RParen) {
                loop {
                    let arg_name = self.consume(TokenKind::Ident)?.value;
                    self.consume(TokenKind::Colon)?;
                    let type_name = self.parse_type_name_for_emit()?;
                    args.push(EmitArgDecl {
                        name: arg_name,
                        type_name,
                    });
                    if self.is(TokenKind::RParen) {
                        break;
                    }
                    self.consume(TokenKind::Comma)?;
                }
            }
            self.consume(TokenKind::RParen)?;
            emits.push(ProtocolEmitDecl {
                name,
                args,
                propagation,
            });
        }
        Ok(emits)
    }

    /// Type name in an emit signature: `Ident` or `[Ident]`.
    fn parse_type_name_for_emit(&mut self) -> Result<String, PdlError> {
        if self.is(TokenKind::LBracket) {
            self.advance();
            let inner = self.consume(TokenKind::Ident)?.value;
            self.consume(TokenKind::RBracket)?;
            Ok(format!("[{inner}]"))
        } else {
            Ok(self.consume(TokenKind::Ident)?.value)
        }
    }

    fn parse_emits_decl(&mut self) -> Result<EmitsDecl, PdlError> {
        self.consume(TokenKind::Emits)?;
        let propagation = self.parse_emits_propagation()?;
        let component = self.consume(TokenKind::Ident)?.value;
        self.consume(TokenKind::LBrace)?;
        let emits = self.parse_emits_list_body(propagation)?;
        self.consume(TokenKind::RBrace)?;
        Ok(EmitsDecl { component, emits })
    }

    fn parse_interaction_handler_body(&mut self) -> Result<Vec<InteractionHandlerItem>, PdlError> {
        let mut items: Vec<InteractionHandlerItem> = Vec::new();
        while !self.is(TokenKind::RBrace) {
            if self.is(TokenKind::If) {
                items.push(InteractionHandlerItem::If {
                    chain: self.parse_interaction_if_chain()?,
                });
                continue;
            }
            if self.is(TokenKind::Animate) {
                self.advance();
                self.consume(TokenKind::Eq)?;
                items.push(InteractionHandlerItem::Animate {
                    value: self.parse_value_expr()?,
                });
                continue;
            }
            if self.is(TokenKind::Emit) {
                self.advance();
                let name = self.consume(TokenKind::Ident)?.value;
                let mut args = Vec::new();
                if self.is(TokenKind::LParen) {
                    self.advance();
                    if !self.is(TokenKind::RParen) {
                        loop {
                            if self.is(TokenKind::SelfKw) {
                                self.advance();
                                if self.is(TokenKind::Dot) {
                                    self.advance();
                                    let m = self.consume(TokenKind::Ident)?.value;
                                    args.push(format!("self.{m}"));
                                } else {
                                    args.push("self".to_string());
                                }
                            } else {
                                args.push(self.consume(TokenKind::Ident)?.value);
                            }
                            if self.is(TokenKind::RParen) {
                                break;
                            }
                            self.consume(TokenKind::Comma)?;
                        }
                    }
                    self.consume(TokenKind::RParen)?;
                }
                items.push(InteractionHandlerItem::Emit { name, args });
                continue;
            }
            if self.is(TokenKind::Ident) {
                let name = self.peek().value.clone();
                if (name == "from" || name == "to") && self.peek_ahead_kind(1) == TokenKind::LBrace
                {
                    return Err(self.err(
                        "`from { }` / `to { }` were removed; write `animate = Motion(transition: …, pose: Pose(…))`",
                    ));
                }
                if (name == "stagger" || name == "staggerFrom")
                    && self.peek_ahead_kind(1) == TokenKind::Eq
                {
                    return Err(self.err(
                        "`stagger` / `staggerFrom` handler keys were removed; write `stagger: Stagger(step: …, from: .first)` on Motion",
                    ));
                }
            }
            let mut self_prefixed = false;
            let param = if self.is(TokenKind::SelfKw) {
                self.advance();
                self.consume(TokenKind::Dot)?;
                self_prefixed = true;
                self.consume(TokenKind::Ident)?.value
            } else {
                self.consume(TokenKind::Ident)?.value
            };
            // Let-qualified host verb: `Input.beginEditing(draft)` / `Input.finishEditing()`.
            if !self_prefixed
                && self.is(TokenKind::Dot)
                && self.peek_ahead_kind(1) == TokenKind::Ident
            {
                let after_ident = self.peek_ahead_kind(2);
                if after_ident == TokenKind::LParen {
                    self.advance(); // .
                    let verb = self.consume(TokenKind::Ident)?.value;
                    let args = self.parse_host_verb_args()?;
                    items.push(InteractionHandlerItem::HostVerb {
                        qualifier: Some(param),
                        name: verb,
                        args,
                    });
                    continue;
                }
            }
            // `Label.content = …` — frame-prop assign; handlers only mutate params.
            if self.is(TokenKind::Dot) {
                self.advance();
                let prop = self.consume(TokenKind::Ident)?.value;
                let lhs = if self_prefixed {
                    format!("self.{param}.{prop}")
                } else {
                    format!("{param}.{prop}")
                };
                return Err(self.err(format!(
                    "Interaction handlers can only assign component parameters (e.g. `interactionState = .hovered`), not frame props like `{lhs}`. Put `{param}.{prop} = …` in the layout body / `if` branch instead (handlers set params; layout `if` updates chrome)"
                )));
            }
            // Host verb: `beginEditing(value)` / `cancelEditing()`
            if self.is(TokenKind::LParen) {
                let args = self.parse_host_verb_args()?;
                items.push(InteractionHandlerItem::HostVerb {
                    qualifier: None,
                    name: param,
                    args,
                });
                continue;
            }
            self.consume(TokenKind::Eq)?;
            items.push(InteractionHandlerItem::Assign {
                param,
                value: self.parse_value_expr()?,
            });
        }
        Ok(items)
    }

    fn parse_interaction_if_chain(&mut self) -> Result<InteractionIfChain, PdlError> {
        let mut branches: Vec<InteractionIfBranch> = Vec::new();
        self.consume(TokenKind::If)?;
        let c0 = self.parse_condition_expr()?;
        self.consume(TokenKind::LBrace)?;
        let b0 = self.parse_interaction_handler_body()?;
        self.consume(TokenKind::RBrace)?;
        branches.push(InteractionIfBranch {
            condition: c0,
            body: b0,
        });
        while self.is(TokenKind::Else) {
            self.advance();
            if self.is(TokenKind::If) {
                self.advance();
                let c = self.parse_condition_expr()?;
                self.consume(TokenKind::LBrace)?;
                let b = self.parse_interaction_handler_body()?;
                self.consume(TokenKind::RBrace)?;
                branches.push(InteractionIfBranch {
                    condition: c,
                    body: b,
                });
            } else {
                self.consume(TokenKind::LBrace)?;
                let else_body = self.parse_interaction_handler_body()?;
                self.consume(TokenKind::RBrace)?;
                return Ok(InteractionIfChain {
                    branches,
                    else_body: Some(else_body),
                });
            }
        }
        Ok(InteractionIfChain {
            branches,
            else_body: None,
        })
    }

    fn parse_fixtures(&mut self) -> Result<FixturesDecl, PdlError> {
        self.consume(TokenKind::Fixtures)?;
        let component = self.consume(TokenKind::Ident)?.value;
        self.consume(TokenKind::LBrace)?;
        let mut examples: Vec<FixtureExampleDecl> = Vec::new();
        while !self.is(TokenKind::RBrace) {
            examples.push(self.parse_fixture_example()?);
        }
        self.consume(TokenKind::RBrace)?;
        Ok(FixturesDecl {
            component,
            examples,
        })
    }

    fn parse_fixture_example(&mut self) -> Result<FixtureExampleDecl, PdlError> {
        self.consume(TokenKind::Example)?;
        let label = self.consume(TokenKind::StringLit)?.value;
        self.consume(TokenKind::LBrace)?;
        let mut bindings: Vec<FixtureBinding> = Vec::new();
        let mut host = None;
        let mut theme = None;
        let mut host_facts = None;
        while !self.is(TokenKind::RBrace) {
            let pname = self.consume_fixture_prop_name()?;
            self.consume(TokenKind::Eq)?;
            let value = self.parse_value_expr()?;
            match pname.as_str() {
                "host" => {
                    host = Some(self.fixture_string_prop(&value, "host")?);
                }
                "theme" => {
                    theme = Some(self.fixture_string_prop(&value, "theme")?);
                }
                "hostFacts" => {
                    host_facts = Some(self.fixture_string_prop(&value, "hostFacts")?);
                }
                _ => bindings.push(FixtureBinding { name: pname, value }),
            }
        }
        self.consume(TokenKind::RBrace)?;
        Ok(FixtureExampleDecl {
            label,
            bindings,
            host,
            theme,
            host_facts,
        })
    }

    fn fixture_string_prop(&self, value: &ValueExpr, key: &str) -> Result<String, PdlError> {
        match value {
            ValueExpr::String { value } => Ok(value.clone()),
            ValueExpr::Ident { name } => Ok(name.clone()),
            _ => Err(self.err(format!(
                "Fixture `{key}` must be a string (hostFacts is a JSON object string)"
            ))),
        }
    }

    fn consume_fixture_prop_name(&mut self) -> Result<String, PdlError> {
        let t = self.peek().clone();
        if t.kind == TokenKind::Ident {
            self.advance();
            if self.is(TokenKind::Dot) && self.peek_ahead_kind(1) == TokenKind::Ident {
                self.advance();
                let field = self.consume(TokenKind::Ident)?.value;
                return Ok(format!("{}.{field}", t.value));
            }
            return Ok(t.value);
        }
        if t.kind == TokenKind::Host {
            self.advance();
            return Ok("host".to_string());
        }
        if t.kind == TokenKind::Theme {
            self.advance();
            return Ok("theme".to_string());
        }
        Err(self.err(format!("Expected fixture property name, got {:?}", t.kind)))
    }

    /// `samples Tracks { pop_results { tracks: [TrackRow] = […] } … }`
    fn parse_samples(&mut self) -> Result<crate::ast::SamplesDecl, PdlError> {
        self.consume(TokenKind::Samples)?;
        let name = self.consume(TokenKind::Ident)?.value;
        self.consume(TokenKind::LBrace)?;
        let mut entries: Vec<crate::ast::SampleEntryDecl> = Vec::new();
        let mut seen_entries = std::collections::HashSet::new();
        while !self.is(TokenKind::RBrace) {
            let entry = self.parse_sample_entry()?;
            if !seen_entries.insert(entry.name.clone()) {
                return Err(self.err(format!(
                    "Duplicate sample entry `{}` in bank `{name}`",
                    entry.name
                )));
            }
            entries.push(entry);
        }
        self.consume(TokenKind::RBrace)?;
        Ok(crate::ast::SamplesDecl { name, entries })
    }

    fn parse_sample_entry(&mut self) -> Result<crate::ast::SampleEntryDecl, PdlError> {
        let name = self.consume(TokenKind::Ident)?.value;
        self.consume(TokenKind::LBrace)?;
        let mut fields: Vec<crate::ast::SampleFieldDecl> = Vec::new();
        let mut seen_fields = std::collections::HashSet::new();
        while !self.is(TokenKind::RBrace) {
            let field = self.parse_sample_field()?;
            if !seen_fields.insert(field.name.clone()) {
                return Err(self.err(format!(
                    "Duplicate sample field `{}` in entry `{name}`",
                    field.name
                )));
            }
            fields.push(field);
        }
        self.consume(TokenKind::RBrace)?;
        Ok(crate::ast::SampleEntryDecl { name, fields })
    }

    fn parse_sample_field(&mut self) -> Result<crate::ast::SampleFieldDecl, PdlError> {
        let name = self.consume(TokenKind::Ident)?.value;
        self.consume(TokenKind::Colon)?;
        let (type_name, is_array) = self.parse_param_type()?;
        self.consume(TokenKind::Eq)?;
        let value = self.parse_value_expr()?;
        Ok(crate::ast::SampleFieldDecl {
            name,
            type_name,
            is_array,
            value,
        })
    }

    fn parse_usage(&mut self) -> Result<UsageDecl, PdlError> {
        self.consume(TokenKind::Usage)?;
        let component = self.consume(TokenKind::Ident)?.value;
        self.consume(TokenKind::LBrace)?;
        let mut props: Vec<UsageProp> = Vec::new();
        while !self.is(TokenKind::RBrace) {
            let key = self.consume_usage_prop_key()?;
            let op = if self.is(TokenKind::PlusEq) {
                self.advance();
                UsageOp::Append
            } else {
                self.consume(TokenKind::Eq)?;
                UsageOp::Assign
            };
            let value = self.consume(TokenKind::StringLit)?.value;
            props.push(UsageProp { key, op, value });
        }
        self.consume(TokenKind::RBrace)?;
        Ok(UsageDecl { component, props })
    }

    fn parse_rules(&mut self) -> Result<RulesDecl, PdlError> {
        self.consume(TokenKind::Rules)?;
        let component = self.consume(TokenKind::Ident)?.value;
        self.consume(TokenKind::LBrace)?;
        let mut statements: Vec<RulesStatement> = Vec::new();
        while !self.is(TokenKind::RBrace) {
            statements.push(self.parse_rules_statement()?);
        }
        self.consume(TokenKind::RBrace)?;
        Ok(RulesDecl {
            component,
            statements,
        })
    }

    fn parse_rules_statement(&mut self) -> Result<RulesStatement, PdlError> {
        if self.is(TokenKind::If) {
            return Ok(RulesStatement::If {
                chain: self.parse_rules_if_chain()?,
            });
        }
        if self.is(TokenKind::Tags) {
            self.advance();
            if self.is(TokenKind::Eq) {
                self.advance();
                self.consume(TokenKind::LBracket)?;
                let mut tags: Vec<String> = Vec::new();
                if !self.is(TokenKind::RBracket) {
                    loop {
                        tags.push(self.consume(TokenKind::StringLit)?.value);
                        if self.is(TokenKind::RBracket) {
                            break;
                        }
                        self.consume(TokenKind::Comma)?;
                    }
                }
                self.consume(TokenKind::RBracket)?;
                return Ok(RulesStatement::TagsSet { tags });
            }
            if self.is(TokenKind::Dot) {
                self.advance();
                let field = self.consume(TokenKind::Ident)?.value;
                if field != "add" {
                    return Err(self.err("Expected tags.add after tags."));
                }
                self.consume(TokenKind::LParen)?;
                let tag = self.consume(TokenKind::StringLit)?.value;
                self.consume(TokenKind::RParen)?;
                return Ok(RulesStatement::TagsAdd { tag });
            }
            return Err(self.err("Expected tags = or tags.add"));
        }
        if self.is(TokenKind::Rule) {
            self.advance();
            self.consume(TokenKind::LParen)?;
            let strength = self.consume(TokenKind::DotEnum)?.value;
            self.consume(TokenKind::Comma)?;
            let query = self.parse_rule_query_argument()?;
            let mut description: Option<String> = None;
            if self.is(TokenKind::Comma) {
                self.advance();
                self.consume(TokenKind::Description)?;
                self.consume(TokenKind::Colon)?;
                description = Some(self.consume(TokenKind::StringLit)?.value);
            }
            self.consume(TokenKind::RParen)?;
            return Ok(RulesStatement::RuleLine {
                strength,
                query,
                description,
            });
        }
        Err(self.err(format!(
            "Unexpected token in rules block: {:?}",
            self.peek().kind
        )))
    }

    fn parse_rules_if_chain(&mut self) -> Result<RulesIfChain, PdlError> {
        let mut branches: Vec<RulesIfBranch> = Vec::new();
        self.consume(TokenKind::If)?;
        let c0 = self.parse_condition_expr()?;
        self.consume(TokenKind::LBrace)?;
        let b0 = self.parse_rules_body()?;
        self.consume(TokenKind::RBrace)?;
        branches.push(RulesIfBranch {
            condition: c0,
            body: b0,
        });
        while self.is(TokenKind::Else) {
            self.advance();
            if self.is(TokenKind::If) {
                self.advance();
                let c = self.parse_condition_expr()?;
                self.consume(TokenKind::LBrace)?;
                let b = self.parse_rules_body()?;
                self.consume(TokenKind::RBrace)?;
                branches.push(RulesIfBranch {
                    condition: c,
                    body: b,
                });
            } else {
                self.consume(TokenKind::LBrace)?;
                let else_body = self.parse_rules_body()?;
                self.consume(TokenKind::RBrace)?;
                return Ok(RulesIfChain {
                    branches,
                    else_body: Some(else_body),
                });
            }
        }
        Ok(RulesIfChain {
            branches,
            else_body: None,
        })
    }

    fn parse_rules_body(&mut self) -> Result<Vec<RulesStatement>, PdlError> {
        let mut out: Vec<RulesStatement> = Vec::new();
        while !self.is(TokenKind::RBrace) {
            out.push(self.parse_rules_statement()?);
        }
        Ok(out)
    }

    /// Returns the parsed navigation axis (the `{ kind: "nav" }` case).
    fn parse_rule_nav_axis(&mut self) -> Result<NavAxis, PdlError> {
        let t = self.peek().clone();
        if t.kind == TokenKind::SelfKw {
            self.advance();
            return Ok(NavAxis::SelfAxis);
        }
        if t.kind == TokenKind::Ident {
            let axis = match t.value.as_str() {
                "parent" => Some(NavAxis::Parent),
                "ancestors" => Some(NavAxis::Ancestors),
                "descendants" => Some(NavAxis::Descendants),
                "siblings" => Some(NavAxis::Siblings),
                "children" => Some(NavAxis::Children),
                _ => None,
            };
            if let Some(axis) = axis {
                self.advance();
                return Ok(axis);
            }
        }
        Err(self.err(format!(
            "Expected rule navigator (self|parent|…), got {:?}",
            t.kind
        )))
    }

    fn parse_rule_path_expr(&mut self) -> Result<RulePathExpr, PdlError> {
        let mut steps: Vec<RulePathStep> = Vec::new();
        let axis = self.parse_rule_nav_axis()?;
        steps.push(RulePathStep::Nav { axis });
        while self.is(TokenKind::Dot) {
            self.advance();
            if self.peek().kind == TokenKind::Ident && self.peek().value == "children" {
                self.advance();
                self.consume(TokenKind::Dot)?;
                let pick = self.peek().clone();
                if pick.kind == TokenKind::Ident && (pick.value == "first" || pick.value == "last")
                {
                    self.advance();
                    let index = if pick.value == "first" {
                        ChildrenPickIndex::First
                    } else {
                        ChildrenPickIndex::Last
                    };
                    steps.push(RulePathStep::ChildrenPick { index });
                } else if pick.kind == TokenKind::Number {
                    let raw = self.advance().value;
                    steps.push(RulePathStep::ChildrenPick {
                        index: ChildrenPickIndex::Index(self.num(&raw)),
                    });
                } else {
                    return Err(self.err("Expected first, last, or number after children."));
                }
            } else {
                return Err(self.err("Invalid rule path segment"));
            }
        }
        Ok(RulePathExpr { steps })
    }

    fn parse_rule_query_argument(&mut self) -> Result<RuleQueryParsed, PdlError> {
        let save = self.index;
        // Speculative: try to parse a `path == path` node-equality query. Any
        // PdlError rewinds and re-parses as a chain query.
        match self.try_node_eq() {
            Ok(Some(node_eq)) => return Ok(node_eq),
            Ok(None) => {}
            Err(_e) => {}
        }
        self.index = save;
        let axis = self.parse_rule_nav_axis()?;
        self.parse_rule_chain_from_axis(axis, Vec::new())
    }

    fn try_node_eq(&mut self) -> Result<Option<RuleQueryParsed>, PdlError> {
        let left = self.parse_rule_path_expr()?;
        if self.is(TokenKind::EqEq) {
            self.advance();
            let right = self.parse_rule_path_expr()?;
            return Ok(Some(RuleQueryParsed::NodeEq { left, right }));
        }
        Ok(None)
    }

    /// `.count` after `where(…)` is lexed as `DotEnum` because `)` is not an ident.
    fn take_rule_dot_name(&mut self) -> Option<String> {
        if self.is(TokenKind::DotEnum) {
            let raw = self.advance().value;
            return Some(raw.trim_start_matches('.').to_string());
        }
        if !self.is(TokenKind::Dot) {
            return None;
        }
        self.advance();
        if self.is(TokenKind::Where) {
            self.advance();
            return Some("where".to_string());
        }
        if self.is(TokenKind::Ident) {
            return Some(self.advance().value);
        }
        None
    }

    fn parse_rule_chain_from_axis(
        &mut self,
        axis: NavAxis,
        mut where_tags: Vec<String>,
    ) -> Result<RuleQueryParsed, PdlError> {
        let mut terminal = RuleChainTerminalParsed::Exists;
        loop {
            let Some(name) = self.take_rule_dot_name() else {
                break;
            };
            if name == "where" {
                self.consume(TokenKind::LParen)?;
                let tag_kw = self.consume(TokenKind::Ident)?.value;
                if tag_kw != "tag" {
                    return Err(self.err("Expected tag in where(tag: \"...\")"));
                }
                self.consume(TokenKind::Colon)?;
                where_tags.push(self.consume(TokenKind::StringLit)?.value);
                self.consume(TokenKind::RParen)?;
                continue;
            }
            if name == "exists" {
                terminal = RuleChainTerminalParsed::Exists;
                break;
            }
            if name == "count" {
                if self.is(TokenKind::Dot) {
                    self.advance();
                    if self.peek().kind == TokenKind::Ident && self.peek().value == "between" {
                        self.advance();
                        self.consume(TokenKind::LParen)?;
                        let low_tok = self.consume(TokenKind::Number)?;
                        let low = self.num(&low_tok.value);
                        self.consume(TokenKind::Comma)?;
                        let high_tok = self.consume(TokenKind::Number)?;
                        let high = self.num(&high_tok.value);
                        self.consume(TokenKind::RParen)?;
                        terminal = RuleChainTerminalParsed::AggregateCompare {
                            op: AggregateOp::Between,
                            right: None,
                            low: Some(low),
                            high: Some(high),
                        };
                        break;
                    }
                    return Err(self.err("Expected count.between after count."));
                }
                let op_kind = self.peek().kind;
                let agg = match op_kind {
                    TokenKind::Gt => Some(AggregateOp::Gt),
                    TokenKind::Ge => Some(AggregateOp::Gte),
                    TokenKind::Lt => Some(AggregateOp::Lt),
                    TokenKind::Le => Some(AggregateOp::Lte),
                    TokenKind::EqEq => Some(AggregateOp::Eq),
                    TokenKind::Ne => Some(AggregateOp::Ne),
                    _ => None,
                };
                if let Some(op) = agg {
                    self.advance();
                    let right_tok = self.consume(TokenKind::Number)?;
                    let right = self.num(&right_tok.value);
                    terminal = RuleChainTerminalParsed::AggregateCompare {
                        op,
                        right: Some(right),
                        low: None,
                        high: None,
                    };
                    break;
                }
                return Err(self.err("Expected comparison after count"));
            }
            let relation = match name.as_str() {
                "precedes" => Some(OrderingRelation::Precedes),
                "follows" => Some(OrderingRelation::Follows),
                "adjacentTo" => Some(OrderingRelation::AdjacentTo),
                _ => None,
            };
            if let Some(relation) = relation {
                self.consume(TokenKind::LParen)?;
                self.consume(TokenKind::SelfKw)?;
                self.consume(TokenKind::RParen)?;
                terminal = RuleChainTerminalParsed::Ordering {
                    relation,
                    r#ref: OrderingRef::SelfRef,
                };
                break;
            }
            return Err(self.err(format!("Unexpected rule query token {name}")));
        }
        Ok(RuleQueryParsed::Chain {
            axis,
            where_tags,
            terminal,
        })
    }

    fn parse_extend(&mut self) -> Result<ExtendDecl, PdlError> {
        self.consume(TokenKind::Extend)?;
        let component = self.consume(TokenKind::Ident)?.value;
        self.consume(TokenKind::LBrace)?;
        let mut sections: Vec<ExtendSection> = Vec::new();
        while !self.is(TokenKind::RBrace) {
            if self.is(TokenKind::Fixtures) {
                self.advance();
                self.consume(TokenKind::LBrace)?;
                let mut examples: Vec<FixtureExampleDecl> = Vec::new();
                while !self.is(TokenKind::RBrace) {
                    examples.push(self.parse_fixture_example()?);
                }
                self.consume(TokenKind::RBrace)?;
                sections.push(ExtendSection::Fixtures { examples });
                continue;
            }
            if self.is(TokenKind::Usage) {
                self.advance();
                self.consume(TokenKind::LBrace)?;
                let mut props: Vec<UsageProp> = Vec::new();
                while !self.is(TokenKind::RBrace) {
                    let key = self.consume_usage_prop_key()?;
                    let op = if self.is(TokenKind::PlusEq) {
                        self.advance();
                        UsageOp::Append
                    } else {
                        self.consume(TokenKind::Eq)?;
                        UsageOp::Assign
                    };
                    let value = self.consume(TokenKind::StringLit)?.value;
                    props.push(UsageProp { key, op, value });
                }
                self.consume(TokenKind::RBrace)?;
                sections.push(ExtendSection::Usage { props });
                continue;
            }
            if self.is(TokenKind::Rules) {
                self.advance();
                self.consume(TokenKind::LBrace)?;
                let mut statements: Vec<RulesStatement> = Vec::new();
                while !self.is(TokenKind::RBrace) {
                    statements.push(self.parse_rules_statement()?);
                }
                self.consume(TokenKind::RBrace)?;
                sections.push(ExtendSection::Rules { statements });
                continue;
            }
            return Err(self.err(format!("Unexpected extend section {:?}", self.peek().kind)));
        }
        self.consume(TokenKind::RBrace)?;
        Ok(ExtendDecl {
            component,
            sections,
        })
    }

    /// Infer a param type name from a default expression (protocol sugar).
    fn infer_type_from_default(expr: &ValueExpr) -> Option<&'static str> {
        match expr {
            ValueExpr::String { .. } => Some("String"),
            ValueExpr::Hex { .. } => Some("Color"),
            ValueExpr::Boolean { .. } => None, // prefer explicit variant / typed form
            ValueExpr::Number { .. } => None,  // ambiguous across Distance/Size/…
            ValueExpr::Call { callee, .. } => Some(match callee {
                CallCallee::Color => "Color",
                CallCallee::Ramp => "Ramp",
                CallCallee::Blur => "Blur",
                CallCallee::MediaLayer => "Media",
                CallCallee::Vibrancy => "Vibrancy",
            }),
            _ => None,
        }
    }

    /// Protocol / optional-typed param: `name: Type = default` or `name = default`.
    fn parse_protocol_param(&mut self) -> Result<ComponentParam, PdlError> {
        let pname = self.consume(TokenKind::Ident)?.value;
        let (mut type_name, is_array) = if self.is(TokenKind::Colon) {
            self.advance();
            self.parse_param_type()?
        } else {
            (String::new(), false)
        };
        self.consume(TokenKind::Eq)?;
        let default_value = self.parse_value_expr()?;
        if type_name.is_empty() {
            // Infer from default; array defaults `[…]` keep is_array.
            match &default_value {
                ValueExpr::Array { .. } => {
                    return Err(self.err(format!(
                        "Protocol param `{pname}` is an array default; declare an explicit element type (`name: [T] = …`)"
                    )));
                }
                _ => {
                    type_name = Self::infer_type_from_default(&default_value)
                        .map(|s| s.to_string())
                        .ok_or_else(|| {
                            self.err(format!(
                                "Protocol param `{pname}` needs an explicit type (`name: Type = …`); could not infer from default"
                            ))
                        })?;
                }
            }
        }
        Ok(ComponentParam {
            name: pname,
            type_name,
            is_array,
            default_value,
        })
    }

    fn parse_protocol_emits_block(&mut self) -> Result<Vec<ProtocolEmitDecl>, PdlError> {
        self.consume(TokenKind::Emits)?;
        let propagation = self.parse_emits_propagation()?;
        self.consume(TokenKind::LBrace)?;
        let emits = self.parse_emits_list_body(propagation)?;
        self.consume(TokenKind::RBrace)?;
        Ok(emits)
    }

    fn parse_protocol(&mut self) -> Result<ProtocolDecl, PdlError> {
        self.consume(TokenKind::Protocol)?;
        let name = self.consume(TokenKind::Ident)?.value;
        // API protocols: `protocol Name: component { … }`
        // Host protocols: `protocol Name { host }` (no `: component`)
        let mut component_subject = false;
        if self.is(TokenKind::Colon) {
            self.advance();
            if self.is(TokenKind::Ident) && matches!(self.peek().value.as_str(), "page" | "screen")
            {
                return Err(self.err_code(
                    "PDL-E001",
                    format!(
                        "Protocol `{name}` subject must be `component`, not `page` / `screen` \
                         (write `protocol {name}: component {{ … }}`; a `page` declaration \
                         auto-conforms to prelude `Page`)"
                    ),
                ));
            }
            if !self.is(TokenKind::Component) {
                return Err(self.err(format!(
                    "Protocol `{name}` subject must be `component` \
                     (write `protocol {name}: component {{ … }}`); \
                     frame kinds are declared on conforming components (§4a)"
                )));
            }
            self.advance();
            component_subject = true;
        }
        self.consume(TokenKind::LBrace)?;
        let mut params: Vec<ComponentParam> = Vec::new();
        let mut emits: Vec<ProtocolEmitDecl> = Vec::new();
        let mut requires: Vec<String> = Vec::new();
        let mut inbound: Vec<String> = Vec::new();
        let mut verbs: Vec<crate::ast::HostVerbDecl> = Vec::new();
        let mut role = ProtocolRole::Api;
        while !self.is(TokenKind::RBrace) {
            if self.is(TokenKind::Emits) {
                emits = self.parse_protocol_emits_block()?;
                continue;
            }
            if self.is(TokenKind::Requires) {
                self.advance();
                let dep = self.consume(TokenKind::Ident)?.value;
                if requires.iter().any(|r| r == &dep) {
                    return Err(self.err(format!(
                        "Protocol `{name}` lists `requires {dep}` more than once"
                    )));
                }
                requires.push(dep);
                continue;
            }
            if self.is(TokenKind::Host) {
                self.advance();
                role = ProtocolRole::Host;
                continue;
            }
            // Host inbound channel: bare `pressEnd`
            // Host verb: `beginEditing(value)` / `cancelEditing()`
            if role == ProtocolRole::Host
                && self.is(TokenKind::Ident)
                && self.peek_ahead_kind(1) != TokenKind::Colon
                && self.peek_ahead_kind(1) != TokenKind::Eq
            {
                let channel = self.consume(TokenKind::Ident)?.value;
                if self.is(TokenKind::LParen) {
                    self.advance();
                    let mut vparams = Vec::new();
                    while !self.is(TokenKind::RParen) {
                        vparams.push(self.consume(TokenKind::Ident)?.value);
                        if self.is(TokenKind::Comma) {
                            self.advance();
                        } else {
                            break;
                        }
                    }
                    self.consume(TokenKind::RParen)?;
                    if verbs.iter().any(|v| v.name == channel) {
                        return Err(self.err(format!(
                            "Host protocol `{name}` lists verb `{channel}` more than once"
                        )));
                    }
                    verbs.push(crate::ast::HostVerbDecl {
                        name: channel,
                        params: vparams,
                    });
                } else {
                    if inbound.iter().any(|c| c == &channel) {
                        return Err(self.err(format!(
                            "Host protocol `{name}` lists inbound `{channel}` more than once"
                        )));
                    }
                    inbound.push(channel);
                }
                continue;
            }
            params.push(self.parse_protocol_param()?);
        }
        self.consume(TokenKind::RBrace)?;
        if role == ProtocolRole::Host {
            if component_subject {
                return Err(self.err(format!(
                    "Host protocol `{name}` must not declare `: component` \
                     (write `protocol {name} {{ host }}`)"
                )));
            }
            if !params.is_empty() {
                return Err(self.err(format!(
                    "Host protocol `{name}` cannot declare params (host powers use ambient channels / verbs)"
                )));
            }
            if !emits.is_empty() {
                return Err(self.err(format!(
                    "Host protocol `{name}` cannot declare `emits` (use API protocols for child→parent intents)"
                )));
            }
        } else if !component_subject {
            return Err(self.err(format!(
                "API protocol `{name}` must declare subject `component` \
                 (write `protocol {name}: component {{ … }}`; host protocols use `{{ host }}`)"
            )));
        } else if !inbound.is_empty() || !verbs.is_empty() {
            return Err(self.err(format!(
                "API protocol `{name}` cannot declare host inbound channels / verbs \
                 (mark with `host` or move channels to a host protocol)"
            )));
        }
        Ok(ProtocolDecl {
            name,
            role,
            requires,
            params,
            emits,
            inbound,
            verbs,
        })
    }

    fn parse_component(&mut self) -> Result<ComponentDecl, PdlError> {
        self.parse_component_like(ComponentRole::Component)
    }

    fn parse_component_like(&mut self, role: ComponentRole) -> Result<ComponentDecl, PdlError> {
        match role {
            ComponentRole::Component => {
                self.consume(TokenKind::Component)?;
            }
            ComponentRole::Page | ComponentRole::Screen => {
                let t = self.consume(TokenKind::Ident)?;
                if t.value != role.as_str() {
                    return Err(self.err(format!(
                        "Expected `{}`, got `{}`",
                        role.as_str(),
                        t.value
                    )));
                }
            }
        }
        let name = self.consume(TokenKind::Ident)?.value;
        if RESERVED_FRAME_CTOR_COMPONENT_NAMES.contains(&name.as_str()) {
            return Err(self.err(format!(
                "Component name `{name}` is reserved for the World A frame constructor; rename the component"
            )));
        }
        // Optional `component Name <P, Q>` receive list, then `emits <R, S>` send list.
        let conforms_to = if self.is(TokenKind::Lt) {
            self.parse_protocol_header_list(&name)?
        } else {
            Vec::new()
        };
        let mut emits_protocols = Vec::new();
        if self.is(TokenKind::Emits) && self.peek_ahead_kind(1) == TokenKind::Lt {
            self.advance();
            emits_protocols = self.parse_emits_protocol_list(&name)?;
        }
        self.consume(TokenKind::LParen)?;
        let mut params: Vec<ComponentParam> = Vec::new();
        if !self.is(TokenKind::RParen) {
            loop {
                let pname = self.consume(TokenKind::Ident)?.value;
                self.consume(TokenKind::Colon)?;
                let (type_name, is_array) = self.parse_param_type()?;
                self.consume(TokenKind::Eq)?;
                let default_value = self.parse_value_expr()?;
                params.push(ComponentParam {
                    name: pname,
                    type_name,
                    is_array,
                    default_value,
                });
                if self.is(TokenKind::RParen) {
                    break;
                }
                self.consume(TokenKind::Comma)?;
            }
        }
        self.consume(TokenKind::RParen)?;
        let rk_tok = self.peek().clone();
        let root_kind = if rk_tok.kind == TokenKind::Ident {
            match rk_tok.value.as_str() {
                "layout" => Some(RootKind::Layout),
                "text" => Some(RootKind::Text),
                "icon" => Some(RootKind::Icon),
                "media" => Some(RootKind::Media),
                _ => None,
            }
        } else {
            None
        };
        let root_kind = match root_kind {
            Some(rk) => {
                self.advance();
                rk
            }
            None => {
                return Err(self.err(format!(
                    "Expected layout|text|icon|media root kind, got {:?}",
                    rk_tok.kind
                )));
            }
        };
        self.consume(TokenKind::LBrace)?;
        let body = lower_world_a_body(self.parse_frame_body_until_close()?);
        self.consume(TokenKind::RBrace)?;
        Ok(ComponentDecl {
            name,
            role,
            conforms_to,
            emits_protocols,
            params,
            root_kind,
            body,
        })
    }

    fn parse_frame_body_until_close(&mut self) -> Result<Vec<FrameBodyItem>, PdlError> {
        let mut items: Vec<FrameBodyItem> = Vec::new();
        while !self.is(TokenKind::RBrace) {
            items.push(self.parse_frame_body_item()?);
        }
        Ok(items)
    }

    fn parse_frame_body_item(&mut self) -> Result<FrameBodyItem, PdlError> {
        if self.is(TokenKind::Use) {
            return Err(self.err_use_outside_mount());
        }
        if self.is(TokenKind::Let) {
            return self.parse_let();
        }
        if self.is(TokenKind::If) {
            return Ok(FrameBodyItem::If {
                chain: self.parse_if_chain()?,
            });
        }
        if self.is(TokenKind::On) {
            return Err(self.err(
                "Layout `on` is not allowed; capture declared emits with \
                 `channel(…) = { … }` or `qualifier.channel(…) = { … }` (§4e). \
                 Host inbound uses `[self.]<channel> = { … }` in the kind body (§4a′ / §8)."
                    .to_string(),
            ));
        }

        // `animate = Motion(…)` — `animate` is a lexer keyword, not Ident.
        if self.is(TokenKind::Animate) && self.peek_ahead_kind(1) == TokenKind::Eq {
            self.advance();
            self.consume(TokenKind::Eq)?;
            if self.is(TokenKind::LBrace) {
                return Err(self.err(
                    "`animate =` on a frame must be a Motion or Transition, not a handler block",
                ));
            }
            return Ok(FrameBodyItem::Prop {
                name: "animate".to_string(),
                value: self.parse_value_expr()?,
            });
        }

        // `self.IDENT = …`:
        // - `{ … }` → host inbound handler
        // - otherwise → prop on the enclosing **component root** (not a nested let)
        if self.is(TokenKind::SelfKw) {
            self.advance();
            self.consume(TokenKind::Dot)?;
            let field = self.consume_frame_field_name()?;
            self.consume(TokenKind::Eq)?;
            if self.is(TokenKind::LBrace) {
                self.consume(TokenKind::LBrace)?;
                let body = self.parse_interaction_handler_body()?;
                self.consume(TokenKind::RBrace)?;
                return Ok(FrameBodyItem::HostHandler { event: field, body });
            }
            let value = if field == "hidden" {
                self.parse_hidden_rhs()?
            } else {
                self.parse_value_expr()?
            };
            return Ok(FrameBodyItem::FrameProp {
                frame: "self".to_string(),
                name: field,
                value,
            });
        }

        let id = self.peek().clone();
        if id.kind == TokenKind::Ident {
            let name = id.value;
            // ForEach(list) { … }
            if name == "ForEach" && self.peek_ahead_kind(1) == TokenKind::LParen {
                self.advance();
                return self.parse_foreach();
            }
            if self.looks_like_emit_capture_assign() {
                return Ok(FrameBodyItem::LayoutOn {
                    handler: self.parse_emit_capture_handler()?,
                });
            }
            // Bare host inbound: `pressEnd = { … }` (same as `self.pressEnd = { … }`)
            if self.peek_ahead_kind(1) == TokenKind::Eq
                && self.peek_ahead_kind(2) == TokenKind::LBrace
            {
                self.advance();
                self.consume(TokenKind::Eq)?;
                self.consume(TokenKind::LBrace)?;
                let body = self.parse_interaction_handler_body()?;
                self.consume(TokenKind::RBrace)?;
                return Ok(FrameBodyItem::HostHandler { event: name, body });
            }
            self.advance();
            if self.is(TokenKind::Dot) {
                self.consume(TokenKind::Dot)?;
                let field = self.consume_frame_field_name()?;
                if PresenterVerb::from_name(&field).is_some() && self.is(TokenKind::LParen) {
                    return Err(self.err_code(
                        "PDL-E055",
                        format!("`{name}.{field}(…)` is only legal in an ancestor-capture body"),
                    ));
                }
                if field == "children" {
                    self.consume(TokenKind::Eq)?;
                    let entries = self.parse_children_rhs()?;
                    return Ok(FrameBodyItem::Children {
                        target: ChildrenTarget::Let { let_id: name },
                        entries,
                    });
                }
                self.consume(TokenKind::Eq)?;
                let value = if field == "hidden" {
                    self.parse_hidden_rhs()?
                } else {
                    self.parse_value_expr()?
                };
                return Ok(FrameBodyItem::FrameProp {
                    frame: name,
                    name: field,
                    value,
                });
            }
            if self.is(TokenKind::Eq) {
                self.advance();
                if name == "children" {
                    let entries = self.parse_children_rhs()?;
                    return Ok(FrameBodyItem::Children {
                        target: ChildrenTarget::Root,
                        entries,
                    });
                }
                let value = if name == "hidden" {
                    self.parse_hidden_rhs()?
                } else {
                    self.parse_value_expr()?
                };
                return Ok(FrameBodyItem::Prop { name, value });
            }
            return Err(self.err(format!("Unexpected after identifier {}", name)));
        }
        Err(self.err(format!(
            "Unexpected token in frame body: {:?}",
            self.peek().kind
        )))
    }

    fn parse_foreach(&mut self) -> Result<FrameBodyItem, PdlError> {
        self.consume(TokenKind::LParen)?;
        let list = self.consume(TokenKind::Ident)?.value;
        self.consume(TokenKind::RParen)?;
        self.consume(TokenKind::LBrace)?;
        // Required binder: `ForEach(chips) { chip in … }`
        let item = self.consume(TokenKind::Ident)?.value;
        if !self.is(TokenKind::In) {
            return Err(self.err(format!(
                "ForEach(`{list}`) requires an item binder: \
                 `ForEach({list}) {{ <name> in … }}` (§4e)"
            )));
        }
        self.advance(); // `in`
        let body = self.parse_foreach_body_until_close(&list, &item)?;
        self.consume(TokenKind::RBrace)?;
        Ok(FrameBodyItem::ForEach { list, item, body })
    }

    fn parse_foreach_body_until_close(
        &mut self,
        list: &str,
        item: &str,
    ) -> Result<Vec<FrameBodyItem>, PdlError> {
        let mut body = Vec::new();
        while !self.is(TokenKind::RBrace) {
            body.push(self.parse_foreach_body_item(list, item)?);
        }
        Ok(body)
    }

    fn parse_foreach_body_item(
        &mut self,
        list: &str,
        item: &str,
    ) -> Result<FrameBodyItem, PdlError> {
        if self.is(TokenKind::If) {
            return Ok(FrameBodyItem::If {
                chain: self.parse_foreach_if_chain(list, item)?,
            });
        }
        if self.is(TokenKind::On) {
            return Err(self.err(format!(
                "Layout `on` is not allowed inside ForEach; use \
                 `{item}.channel(…) = {{ … }}` for declared emit capture (§4e)."
            )));
        }
        if self.is(TokenKind::Let) {
            return Err(self.err(format!(
                "ForEach(`{list}`) cannot declare `let` bindings; only `{item}.field = …`, \
                 `{item}.channel(…) = {{ … }}`, and `if` / `else` (§4e)"
            )));
        }
        if self.looks_like_emit_capture_assign() {
            let mut handler = self.parse_emit_capture_handler()?;
            match handler.qualifier.as_deref() {
                Some(q) if q == item => {
                    // Binder-qualified capture → catalogue uses the list name.
                    handler.qualifier = None;
                }
                Some(q) => {
                    return Err(self.err(format!(
                        "ForEach(`{list}`) emit capture qualifier `{q}` must be the \
                         item binder `{item}` (write `{item}.{}(…) = {{ … }}`)",
                        handler.channel
                    )));
                }
                None => {
                    return Err(self.err(format!(
                        "ForEach(`{list}`) emit capture must be binder-qualified: \
                         `{item}.{}(…) = {{ … }}` (§4e)",
                        handler.channel
                    )));
                }
            }
            return Ok(FrameBodyItem::LayoutOn { handler });
        }
        // Item override: `item.field = expr`
        let qual = self.consume(TokenKind::Ident)?.value;
        if qual != item {
            return Err(self.err(format!(
                "ForEach(`{list}`) body must qualify overrides with binder `{item}` \
                 (got `{qual}`); write `{item}.… = …`"
            )));
        }
        self.consume(TokenKind::Dot)?;
        let param = self.consume(TokenKind::Ident)?.value;
        self.consume(TokenKind::Eq)?;
        let value = self.parse_value_expr()?;
        Ok(FrameBodyItem::FrameProp {
            frame: item.to_string(),
            name: param,
            value,
        })
    }

    fn parse_foreach_if_chain(&mut self, list: &str, item: &str) -> Result<IfChain, PdlError> {
        let mut branches: Vec<IfBranch> = Vec::new();
        self.consume(TokenKind::If)?;
        let c0 = self.parse_condition_expr()?;
        self.consume(TokenKind::LBrace)?;
        let b0 = self.parse_foreach_body_until_close(list, item)?;
        self.consume(TokenKind::RBrace)?;
        branches.push(IfBranch {
            condition: c0,
            body: b0,
        });
        while self.is(TokenKind::Else) {
            self.advance();
            if self.is(TokenKind::If) {
                self.advance();
                let c = self.parse_condition_expr()?;
                self.consume(TokenKind::LBrace)?;
                let b = self.parse_foreach_body_until_close(list, item)?;
                self.consume(TokenKind::RBrace)?;
                branches.push(IfBranch {
                    condition: c,
                    body: b,
                });
            } else {
                self.consume(TokenKind::LBrace)?;
                let else_body = self.parse_foreach_body_until_close(list, item)?;
                self.consume(TokenKind::RBrace)?;
                return Ok(IfChain {
                    branches,
                    else_body: Some(else_body),
                });
            }
        }
        Ok(IfChain {
            branches,
            else_body: None,
        })
    }

    /// Emit capture: `channel(…) = {` / `qual.channel(…) = {` — parentheses required
    /// so bare `pressEnd = { … }` can mean host inbound (§4a′).
    fn looks_like_emit_capture_assign(&self) -> bool {
        if self.peek().kind != TokenKind::Ident {
            return false;
        }
        let mut i = 1usize;
        if self.peek_ahead_kind(i) == TokenKind::Dot {
            if self.peek_ahead_kind(i + 1) != TokenKind::Ident {
                return false;
            }
            i += 2;
        }
        if self.peek_ahead_kind(i) != TokenKind::LParen {
            return false;
        }
        i += 1;
        let mut depth = 1i32;
        while depth > 0 {
            let k = self.peek_ahead_kind(i);
            if k == TokenKind::Eof {
                return false;
            }
            if k == TokenKind::LParen {
                depth += 1;
            } else if k == TokenKind::RParen {
                depth -= 1;
            }
            i += 1;
        }
        self.peek_ahead_kind(i) == TokenKind::Eq && self.peek_ahead_kind(i + 1) == TokenKind::LBrace
    }

    /// `ident` / `self.ident` followed by `==` / `!=` (comparison bind / if-cond).
    fn looks_like_condition_start(&self) -> bool {
        let k0 = self.peek().kind;
        if k0 == TokenKind::SelfKw {
            if self.peek_ahead_kind(1) != TokenKind::Dot {
                return false;
            }
            if self.peek_ahead_kind(2) != TokenKind::Ident {
                return false;
            }
            let op = self.peek_ahead_kind(3);
            return op == TokenKind::EqEq || op == TokenKind::Ne;
        }
        if k0 == TokenKind::Ident {
            let op = self.peek_ahead_kind(1);
            return op == TokenKind::EqEq || op == TokenKind::Ne;
        }
        false
    }

    /// `select(…) = { … }` / `Field.change(…) = { … }` / ForEach `chip.select(…) = { … }`
    fn parse_emit_capture_handler(&mut self) -> Result<LayoutOnHandler, PdlError> {
        let first = self.consume(TokenKind::Ident)?.value;
        let (qualifier, channel) = if self.is(TokenKind::Dot) {
            self.advance();
            let ch = self.consume(TokenKind::Ident)?.value;
            (Some(first), ch)
        } else {
            (None, first)
        };
        let mut payload = Vec::new();
        if self.is(TokenKind::LParen) {
            self.advance();
            if !self.is(TokenKind::RParen) {
                loop {
                    let arg_name = self.consume(TokenKind::Ident)?.value;
                    self.consume(TokenKind::Colon)?;
                    let type_name = self.parse_type_name_for_emit()?;
                    payload.push(EmitArgDecl {
                        name: arg_name,
                        type_name,
                    });
                    if self.is(TokenKind::RParen) {
                        break;
                    }
                    self.consume(TokenKind::Comma)?;
                }
            }
            self.consume(TokenKind::RParen)?;
        }
        self.consume(TokenKind::Eq)?;
        self.consume(TokenKind::LBrace)?;
        let mut body = Vec::new();
        while !self.is(TokenKind::RBrace) {
            let first = if self.is(TokenKind::SelfKw) {
                self.advance();
                self.consume(TokenKind::Dot)?;
                self.consume(TokenKind::Ident)?.value
            } else {
                self.consume(TokenKind::Ident)?.value
            };
            // `Input.beginEditing(draft)` / `presenter.replace(Episode(…))`
            if self.is(TokenKind::Dot)
                && self.peek_ahead_kind(1) == TokenKind::Ident
                && self.peek_ahead_kind(2) == TokenKind::LParen
            {
                self.advance();
                let verb = self.consume(TokenKind::Ident)?.value;
                if let Some(pv) = PresenterVerb::from_name(&verb) {
                    let args = self.parse_presenter_verb_args()?;
                    body.push(LayoutOnBodyItem::PresenterVerb {
                        qualifier: first,
                        verb: pv,
                        page: args.page,
                        style: args.style,
                        move_spec: args.move_spec,
                        dismiss_move: args.dismiss_move,
                    });
                    continue;
                }
                let args = self.parse_host_verb_args()?;
                body.push(LayoutOnBodyItem::HostVerb {
                    qualifier: Some(first),
                    name: verb,
                    args,
                });
                continue;
            }
            // Bare host verb (unusual in emit captures, but allowed).
            if self.is(TokenKind::LParen) {
                let args = self.parse_host_verb_args()?;
                body.push(LayoutOnBodyItem::HostVerb {
                    qualifier: None,
                    name: first,
                    args,
                });
                continue;
            }
            self.consume(TokenKind::Eq)?;
            let value = self.parse_value_expr()?;
            body.push(LayoutOnBodyItem::Assign(LayoutOnAssign {
                param: first,
                value,
            }));
        }
        self.consume(TokenKind::RBrace)?;
        Ok(LayoutOnHandler {
            qualifier,
            channel,
            payload,
            body,
        })
    }

    /// `()` / `(Episode(…))` / `(Settings(), style: .cover)` / `(Episode(), move:, dismissMove:)`.
    fn parse_presenter_verb_args(&mut self) -> Result<PresenterVerbArgs, PdlError> {
        self.consume(TokenKind::LParen)?;
        let mut out = PresenterVerbArgs::default();
        if !self.is(TokenKind::RParen) {
            if !(self.is(TokenKind::Ident) && self.peek_ahead_kind(1) == TokenKind::Colon) {
                out.page = Some(self.parse_value_expr()?);
                if self.is(TokenKind::Comma) {
                    self.advance();
                }
            }
            while !self.is(TokenKind::RParen) {
                let key = self.consume(TokenKind::Ident)?.value;
                self.consume(TokenKind::Colon)?;
                match key.as_str() {
                    "style" => {
                        let raw = if self.is(TokenKind::DotEnum) {
                            self.advance().value
                        } else if self.is(TokenKind::Ident) {
                            self.advance().value
                        } else {
                            return Err(self.err("Presenter `style` must be a case (`.cover`)"));
                        };
                        out.style = Some(raw.trim_start_matches('.').to_string());
                    }
                    "move" => out.move_spec = Some(self.parse_value_expr()?),
                    "dismissMove" => out.dismiss_move = Some(self.parse_value_expr()?),
                    other => {
                        return Err(self.err(format!(
                            "Unknown presenter argument `{other}` (expected `style`, `move`, `dismissMove`)"
                        )));
                    }
                }
                if self.is(TokenKind::Comma) {
                    self.advance();
                }
            }
        }
        self.consume(TokenKind::RParen)?;
        Ok(out)
    }

    /// `(draft)` / `(value, …)` / `()` after a host verb name.
    fn parse_host_verb_args(&mut self) -> Result<Vec<String>, PdlError> {
        self.consume(TokenKind::LParen)?;
        let mut args = Vec::new();
        if !self.is(TokenKind::RParen) {
            loop {
                if self.is(TokenKind::SelfKw) {
                    self.advance();
                    if self.is(TokenKind::Dot) {
                        self.advance();
                        let m = self.consume(TokenKind::Ident)?.value;
                        args.push(format!("self.{m}"));
                    } else {
                        args.push("self".to_string());
                    }
                } else {
                    args.push(self.consume(TokenKind::Ident)?.value);
                }
                if self.is(TokenKind::RParen) {
                    break;
                }
                self.consume(TokenKind::Comma)?;
            }
        }
        self.consume(TokenKind::RParen)?;
        Ok(args)
    }

    fn parse_let(&mut self) -> Result<FrameBodyItem, PdlError> {
        self.consume(TokenKind::Let)?;
        let id = self.consume(TokenKind::Ident)?.value;
        if self.is(TokenKind::Eq) {
            self.advance();
            // World A: `let title = Text(…)` / `Layout(…)` / `Icon(…)` / `Media(…)`
            if let Some(ctor) = self.peek_frame_ctor_name() {
                self.advance(); // ctor name (Ident or Icon/Media keyword)
                self.consume(TokenKind::LParen)?;
                let (props, child_entries) = self.parse_frame_ctor_args()?;
                self.consume(TokenKind::RParen)?;
                let frame_kind = frame_ctor_to_kind(ctor)
                    .expect("peek_frame_ctor_name only returns known ctors")
                    .to_string();
                let body = if ctor == "Presenter" {
                    self.presenter_ctor_body(props, child_entries)?
                } else {
                    frame_ctor_kwargs_to_body(&props, child_entries)
                };
                return Ok(FrameBodyItem::Let {
                    id,
                    frame_kind,
                    body,
                });
            }
            // `let x = Comp(…)` → instance; `let blur = Blur(…)` → value let (inferred)
            let value = self.parse_value_expr()?;
            if let ValueExpr::Instance { component, kwargs } = value {
                return Ok(FrameBodyItem::LetInstance {
                    id,
                    component,
                    kwargs,
                });
            }
            let Some(type_name) = infer_value_let_type(&value) else {
                return Err(self.err(format!(
                    "Value let `{id}` requires a type annotation (`let {id}: Type = …`); could not infer type from RHS"
                )));
            };
            return Ok(FrameBodyItem::LetValue {
                id,
                type_name: type_name.to_string(),
                value,
            });
        }
        self.consume(TokenKind::Colon)?;
        // Classic frame let removed — World A only: `let Id = Text|Layout|Icon|Media(…)`
        // Value let: `let ramp: Ramp = Ramp(…)`
        let t = self.peek().clone();
        let is_frame_kind = t.kind == TokenKind::Ident
            && matches!(t.value.as_str(), "layout" | "text" | "icon" | "media");
        if is_frame_kind {
            let frame_kind = t.value.as_str();
            let ctor = match frame_kind {
                "text" => "Text",
                "layout" => "Layout",
                "icon" => "Icon",
                "media" => "Media",
                _ => unreachable!(),
            };
            return Err(self.err(format!(
                "Classic frame let `let {id}: {frame_kind} = {{ … }}` was removed; use `let {id} = {ctor}(…)` (World A — see docs/PROPOSAL_WORLD_A_EXPRESSION_TREES.md)"
            )));
        }
        let type_name = self.consume_param_type_name()?;
        self.consume(TokenKind::Eq)?;
        let value = self.parse_value_expr()?;
        Ok(FrameBodyItem::LetValue {
            id,
            type_name,
            value,
        })
    }

    fn parse_if_chain(&mut self) -> Result<IfChain, PdlError> {
        let mut branches: Vec<IfBranch> = Vec::new();
        self.consume(TokenKind::If)?;
        let c0 = self.parse_condition_expr()?;
        self.consume(TokenKind::LBrace)?;
        let b0 = self.parse_frame_body_until_close()?;
        self.consume(TokenKind::RBrace)?;
        branches.push(IfBranch {
            condition: c0,
            body: b0,
        });
        while self.is(TokenKind::Else) {
            self.advance();
            if self.is(TokenKind::If) {
                self.advance();
                let c = self.parse_condition_expr()?;
                self.consume(TokenKind::LBrace)?;
                let b = self.parse_frame_body_until_close()?;
                self.consume(TokenKind::RBrace)?;
                branches.push(IfBranch {
                    condition: c,
                    body: b,
                });
            } else {
                self.consume(TokenKind::LBrace)?;
                let else_body = self.parse_frame_body_until_close()?;
                self.consume(TokenKind::RBrace)?;
                return Ok(IfChain {
                    branches,
                    else_body: Some(else_body),
                });
            }
        }
        Ok(IfChain {
            branches,
            else_body: None,
        })
    }

    /// RHS for `hidden =` — boolean literal, `.true` / `.false`, or a variant
    /// `if`-style condition.
    fn parse_hidden_rhs(&mut self) -> Result<ValueExpr, PdlError> {
        let t = self.peek().clone();
        if t.kind == TokenKind::True || t.kind == TokenKind::False {
            self.advance();
            return Ok(ValueExpr::Boolean {
                value: t.kind == TokenKind::True,
            });
        }
        if t.kind == TokenKind::DotEnum && (t.value == ".true" || t.value == ".false") {
            self.advance();
            return Ok(ValueExpr::Boolean {
                value: t.value == ".true",
            });
        }
        let start = self.index;
        let expr = self.parse_cond_or()?;
        self.assert_no_mixed_and_or(start, self.index)?;
        Ok(ValueExpr::Condition { expr })
    }

    fn parse_condition_expr(&mut self) -> Result<ConditionExpr, PdlError> {
        let start = self.index;
        let end = self.find_condition_end()?;
        self.assert_no_mixed_and_or(start, end)?;
        self.parse_cond_or()
    }

    fn find_condition_end(&self) -> Result<usize, PdlError> {
        let mut j = self.index;
        let mut depth: i32 = 0;
        while j < self.tokens.len() {
            let k = self.tokens[j].kind;
            if k == TokenKind::LParen {
                depth += 1;
            } else if k == TokenKind::RParen {
                depth -= 1;
            } else if depth == 0 && k == TokenKind::LBrace {
                return Ok(j);
            }
            j += 1;
        }
        Err(self.err("Unterminated condition (expected `{`)"))
    }

    fn assert_no_mixed_and_or(&self, start: usize, end: usize) -> Result<(), PdlError> {
        let mut depth: i32 = 0;
        let mut has_and = false;
        let mut has_or = false;
        let mut j = start;
        while j < end {
            let k = self.tokens[j].kind;
            if k == TokenKind::LParen {
                depth += 1;
            } else if k == TokenKind::RParen {
                depth -= 1;
            } else if depth == 0 {
                if k == TokenKind::AndAnd {
                    has_and = true;
                }
                if k == TokenKind::OrOr {
                    has_or = true;
                }
            }
            j += 1;
        }
        if has_and && has_or {
            let tok = &self.tokens[start];
            return Err(PdlError::new(
                "PDL-E038",
                "Cannot mix `&&` and `||` in one condition without parentheses",
                Some(self.file_path.clone()),
                Some(tok.line),
                Some(tok.column),
            ));
        }
        Ok(())
    }

    fn parse_cond_or(&mut self) -> Result<ConditionExpr, PdlError> {
        let mut left = self.parse_cond_and()?;
        while self.is(TokenKind::OrOr) {
            self.advance();
            let right = self.parse_cond_and()?;
            left = match left {
                ConditionExpr::Or { mut items } => {
                    items.push(right);
                    ConditionExpr::Or { items }
                }
                other => ConditionExpr::Or {
                    items: vec![other, right],
                },
            };
        }
        Ok(left)
    }

    fn parse_cond_and(&mut self) -> Result<ConditionExpr, PdlError> {
        let mut left = self.parse_cond_atom()?;
        while self.is(TokenKind::AndAnd) {
            self.advance();
            let right = self.parse_cond_atom()?;
            left = match left {
                ConditionExpr::And { mut items } => {
                    items.push(right);
                    ConditionExpr::And { items }
                }
                other => ConditionExpr::And {
                    items: vec![other, right],
                },
            };
        }
        Ok(left)
    }

    fn parse_cond_atom(&mut self) -> Result<ConditionExpr, PdlError> {
        if self.is(TokenKind::LParen) {
            self.advance();
            let inner = self.parse_cond_or()?;
            self.consume(TokenKind::RParen)?;
            return Ok(inner);
        }
        // `self.param` or bare `param`
        let param = if self.is(TokenKind::SelfKw) {
            self.advance();
            self.consume(TokenKind::Dot)?;
            self.consume(TokenKind::Ident)?.value
        } else {
            self.consume(TokenKind::Ident)?.value
        };
        let op = if self.is(TokenKind::EqEq) {
            self.advance();
            CmpOp::Eq
        } else if self.is(TokenKind::Ne) {
            self.advance();
            CmpOp::Ne
        } else {
            // Bare boolean param: `if selected { … }`
            return Ok(ConditionExpr::Truthy { param });
        };
        if self.is(TokenKind::DotEnum) {
            let rhs = self.advance().value;
            Ok(ConditionExpr::Cmp {
                param,
                op,
                rhs,
                rhs_is_param: false,
            })
        } else if self.is(TokenKind::Ident)
            && looks_like_qualified_enum_type_name(&self.peek().value)
            && self.peek_ahead_kind(1) == TokenKind::Dot
            && self.peek_ahead_kind(2) == TokenKind::Ident
            && self.peek_ahead_kind(3) != TokenKind::Dot
            && self.peek_ahead_kind(3) != TokenKind::LParen
        {
            // `Tone.primary` → same as `.primary` (frame enums / user variants)
            self.advance();
            self.consume(TokenKind::Dot)?;
            let case_name = self.consume(TokenKind::Ident)?.value;
            Ok(ConditionExpr::Cmp {
                param,
                op,
                rhs: format!(".{case_name}"),
                rhs_is_param: false,
            })
        } else if self.is(TokenKind::Ident) {
            let rhs = self.advance().value;
            Ok(ConditionExpr::Cmp {
                param,
                op,
                rhs,
                rhs_is_param: true,
            })
        } else if self.is(TokenKind::SelfKw) {
            self.advance();
            self.consume(TokenKind::Dot)?;
            let rhs = self.consume(TokenKind::Ident)?.value;
            Ok(ConditionExpr::Cmp {
                param,
                op,
                rhs,
                rhs_is_param: true,
            })
        } else if self.is(TokenKind::True) || self.is(TokenKind::False) {
            let rhs = self.advance().value;
            Ok(ConditionExpr::Cmp {
                param,
                op,
                rhs,
                rhs_is_param: false,
            })
        } else {
            Err(self.err("Expected variant case (.case), boolean, or parameter name in condition"))
        }
    }

    pub fn parse_value_expr(&mut self) -> Result<ValueExpr, PdlError> {
        // Comparison as a value (ForEach binds / kwargs): `self.currentFilter == filter`
        if self.looks_like_condition_start() {
            let start = self.index;
            let expr = self.parse_cond_or()?;
            self.assert_no_mixed_and_or(start, self.index)?;
            return Ok(ValueExpr::Condition { expr });
        }
        let lhs = self.parse_primary_value()?;
        if self.is(TokenKind::QuestionQuestion) {
            return Err(self.err_code("PDL-E047", "`??` is only valid in a `mount` coalesce chain"));
        }
        if self.is(TokenKind::At) {
            self.advance();
            let op = self.parse_primary_value()?;
            return self.apply_opacity_sugar(lhs, op);
        }
        Ok(lhs)
    }

    /// Postfix `@ Opacity`: colors → OpacityOf; MediaLayer → `opacity:`; Color → wrap `color:`.
    fn apply_opacity_sugar(
        &self,
        lhs: ValueExpr,
        opacity: ValueExpr,
    ) -> Result<ValueExpr, PdlError> {
        match lhs {
            ValueExpr::Call {
                callee: CallCallee::MediaLayer,
                mut args,
            } => {
                if args.contains_key("opacity") {
                    return Err(self.err(
                        "`MediaLayer(…)` already has `opacity:`; cannot also apply postfix `@` (PDL-E020)",
                    ));
                }
                args.insert("opacity".to_string(), opacity);
                Ok(ValueExpr::Call {
                    callee: CallCallee::MediaLayer,
                    args,
                })
            }
            ValueExpr::Call {
                callee: CallCallee::Color,
                mut args,
            } => {
                let Some(color) = args.swap_remove("color") else {
                    return Err(self.err("`Color(…)` requires `color:` before postfix `@`"));
                };
                args.insert(
                    "color".to_string(),
                    ValueExpr::OpacityOf {
                        base: Box::new(color),
                        opacity: Box::new(opacity),
                    },
                );
                Ok(ValueExpr::Call {
                    callee: CallCallee::Color,
                    args,
                })
            }
            ValueExpr::Call { callee, .. } => {
                let name = match callee {
                    CallCallee::Ramp => "Ramp",
                    CallCallee::Blur => "Blur",
                    CallCallee::Vibrancy => "Vibrancy",
                    CallCallee::Color => "Color",
                    CallCallee::MediaLayer => "MediaLayer",
                };
                Err(self.err(format!(
                    "Cannot apply `@` opacity to `{name}(…)` (not opacity-bearing; use a Color/Media layer or frame opacity)"
                )))
            }
            ValueExpr::Hex { .. } | ValueExpr::Ident { .. } | ValueExpr::OpacityOf { .. } => {
                Ok(ValueExpr::OpacityOf {
                    base: Box::new(lhs),
                    opacity: Box::new(opacity),
                })
            }
            other => Err(self.err(format!(
                "Cannot apply `@` opacity to {other:?} (expected a Color, MediaLayer(…), or color token)"
            ))),
        }
    }

    fn parse_optional_child_opacity(&mut self) -> Result<Option<ValueExpr>, PdlError> {
        if !self.is(TokenKind::At) {
            return Ok(None);
        }
        self.advance();
        Ok(Some(self.parse_primary_value()?))
    }

    fn parse_primary_value(&mut self) -> Result<ValueExpr, PdlError> {
        let t = self.peek().clone();
        match t.kind {
            TokenKind::Host if self.peek_ahead_kind(1) == TokenKind::LBracket => {
                return Err(self.err_code(
                    "PDL-E047",
                    "`host[\"…\"]` is only valid inside a `mount` body",
                ));
            }
            TokenKind::QuestionQuestion => {
                return Err(
                    self.err_code("PDL-E047", "`??` is only valid in a `mount` coalesce chain")
                );
            }
            TokenKind::HexColor => {
                self.advance();
                return Ok(ValueExpr::Hex { value: t.value });
            }
            TokenKind::StringLit => {
                self.advance();
                return Ok(ValueExpr::String { value: t.value });
            }
            TokenKind::Number => {
                self.advance();
                // Ratio sugar: `16:9` → width/height (Ratio tokens / aspectRatio).
                if self.is(TokenKind::Colon) && self.peek_ahead_kind(1) == TokenKind::Number {
                    self.advance(); // ':'
                    let h = self.consume(TokenKind::Number)?;
                    let width = self.num(&t.value);
                    let height = self.num(&h.value);
                    if !(height > 0.0) || !width.is_finite() || !height.is_finite() {
                        return Err(self.err(
                            "Ratio sugar `W:H` requires a positive finite height (e.g. `16:9`)",
                        ));
                    }
                    return Ok(ValueExpr::Ratio { width, height });
                }
                return Ok(ValueExpr::Number {
                    value: self.num(&t.value),
                });
            }
            TokenKind::True | TokenKind::False => {
                self.advance();
                return Ok(ValueExpr::Boolean {
                    value: t.kind == TokenKind::True,
                });
            }
            TokenKind::Null => {
                self.advance();
                return Ok(ValueExpr::Null);
            }
            TokenKind::DotEnum => {
                self.advance();
                let v = t.value;
                // Bare `.hug` / `.fill` stay as DotEnum so ContentMode.fill and Sizing.fill
                // share spelling. Qualified `Sizing.hug` / `Sizing.fill` still produce sizing
                // literals on the Sizing keyword branch below.
                if v == ".fixed" {
                    if !self.is(TokenKind::LParen) {
                        return Err(self.err(
                            "`.fixed` requires a Distance number argument, e.g. `.fixed(48)`",
                        ));
                    }
                    self.consume(TokenKind::LParen)?;
                    if !self.is(TokenKind::Number) {
                        return Err(
                            self.err("`.fixed` expects a Distance number (px), e.g. `.fixed(48)`")
                        );
                    }
                    let n = self.consume(TokenKind::Number)?;
                    self.consume(TokenKind::RParen)?;
                    return Ok(ValueExpr::Sizing {
                        mode: SizingMode::Fixed {
                            fixed: self.num(&n.value),
                        },
                    });
                }
                if v == ".flex" {
                    if !self.is(TokenKind::LParen) {
                        return Err(
                            self.err("`.flex` requires arguments, e.g. `.flex(min: 8, max: 120)`")
                        );
                    }
                    self.consume(TokenKind::LParen)?;
                    let flex_args = self.parse_flex_args()?;
                    self.consume(TokenKind::RParen)?;
                    return Ok(ValueExpr::Sizing {
                        mode: SizingMode::Flex { flex_args },
                    });
                }
                if v == ".aspect" {
                    if !self.is(TokenKind::LParen) {
                        return Err(self.err(
                            "`.aspect` requires a ratio argument, e.g. `.aspect(16:9)` or `.aspect(1.5)`",
                        ));
                    }
                    self.consume(TokenKind::LParen)?;
                    let aspect = self.parse_aspect_arg()?;
                    self.consume(TokenKind::RParen)?;
                    return Ok(ValueExpr::Sizing {
                        mode: SizingMode::Aspect {
                            aspect: Box::new(aspect),
                        },
                    });
                }
                return Ok(ValueExpr::DotEnum { value: v });
            }
            // Qualified sizing: `Sizing.hug` / `Sizing.fill` / `Sizing.fixed(n)` / `Sizing.flex(…)`
            TokenKind::Sizing => {
                self.advance();
                self.consume(TokenKind::Dot)?;
                let mode = self.consume(TokenKind::Ident)?.value;
                if mode == "hug" {
                    return Ok(ValueExpr::Sizing {
                        mode: SizingMode::Hug,
                    });
                }
                if mode == "fill" {
                    return Ok(ValueExpr::Sizing {
                        mode: SizingMode::Fill,
                    });
                }
                if mode == "fixed" {
                    if !self.is(TokenKind::LParen) {
                        return Err(self.err(
                            "`Sizing.fixed` requires a Distance number argument, e.g. `Sizing.fixed(48)`",
                        ));
                    }
                    self.consume(TokenKind::LParen)?;
                    if !self.is(TokenKind::Number) {
                        return Err(self.err(
                            "`Sizing.fixed` expects a Distance number (px), e.g. `Sizing.fixed(48)`",
                        ));
                    }
                    let n = self.consume(TokenKind::Number)?;
                    self.consume(TokenKind::RParen)?;
                    return Ok(ValueExpr::Sizing {
                        mode: SizingMode::Fixed {
                            fixed: self.num(&n.value),
                        },
                    });
                }
                if mode == "flex" {
                    if !self.is(TokenKind::LParen) {
                        return Err(self.err(
                            "`Sizing.flex` requires arguments, e.g. `Sizing.flex(min: 8, max: 120)`",
                        ));
                    }
                    self.consume(TokenKind::LParen)?;
                    let flex_args = self.parse_flex_args()?;
                    self.consume(TokenKind::RParen)?;
                    return Ok(ValueExpr::Sizing {
                        mode: SizingMode::Flex { flex_args },
                    });
                }
                if mode == "aspect" {
                    if !self.is(TokenKind::LParen) {
                        return Err(self.err(
                            "`Sizing.aspect` requires a ratio argument, e.g. `Sizing.aspect(16:9)`",
                        ));
                    }
                    self.consume(TokenKind::LParen)?;
                    let aspect = self.parse_aspect_arg()?;
                    self.consume(TokenKind::RParen)?;
                    return Ok(ValueExpr::Sizing {
                        mode: SizingMode::Aspect {
                            aspect: Box::new(aspect),
                        },
                    });
                }
                return Err(self.err(format!(
                    "Unknown Sizing mode `{mode}`; expected hug, fill, fixed, flex, or aspect"
                )));
            }
            TokenKind::Ease => {
                self.advance();
                self.consume(TokenKind::Dot)?;
                let method = self.consume(TokenKind::Ident)?.value;
                if method == "bezier" {
                    self.consume(TokenKind::LParen)?;
                    let x1 = self.parse_value_expr()?;
                    self.consume(TokenKind::Comma)?;
                    let y1 = self.parse_value_expr()?;
                    self.consume(TokenKind::Comma)?;
                    let x2 = self.parse_value_expr()?;
                    self.consume(TokenKind::Comma)?;
                    let y2 = self.parse_value_expr()?;
                    self.consume(TokenKind::RParen)?;
                    return Ok(ValueExpr::EaseBezier {
                        x1: Box::new(x1),
                        y1: Box::new(y1),
                        x2: Box::new(x2),
                        y2: Box::new(y2),
                    });
                }
                if method == "cubic" {
                    return Err(self.err("Write `Ease.bezier(x1, y1, x2, y2)`"));
                }
                if method == "linear" || method == "in" || method == "out" {
                    if self.is(TokenKind::LParen) {
                        return Err(self.err(format!(
                            "`Ease.{method}` takes no arguments; write `.{method}` or `Ease.bezier(…)`"
                        )));
                    }
                    return Ok(ValueExpr::DotEnum {
                        value: format!(".{method}"),
                    });
                }
                return Err(self.err(
                    "Ease is `.linear`, `.in`, `.out`, or `Ease.bezier(x1, y1, x2, y2)`",
                ));
            }
            TokenKind::LParen => {
                return self.parse_paren_value();
            }
            TokenKind::LBracket => {
                self.advance();
                let mut items: Vec<ValueExpr> = Vec::new();
                if !self.is(TokenKind::RBracket) {
                    loop {
                        items.push(self.parse_value_expr()?);
                        if self.is(TokenKind::RBracket) {
                            break;
                        }
                        self.consume(TokenKind::Comma)?;
                    }
                }
                self.consume(TokenKind::RBracket)?;
                return Ok(ValueExpr::Array { items });
            }
            TokenKind::Ident => {
                // Qualified enum: `Justify.center` / `Tone.primary` → same AST as `.center` / `.primary`
                // (Sizing.* stays on the Sizing keyword branch above.)
                if looks_like_qualified_enum_type_name(&t.value)
                    && self.peek_ahead_kind(1) == TokenKind::Dot
                    && self.peek_ahead_kind(2) == TokenKind::Ident
                    && self.peek_ahead_kind(3) != TokenKind::Dot
                    && self.peek_ahead_kind(3) != TokenKind::LParen
                {
                    self.advance();
                    self.consume(TokenKind::Dot)?;
                    let case_name = self.consume(TokenKind::Ident)?.value;
                    return Ok(ValueExpr::DotEnum {
                        value: format!(".{case_name}"),
                    });
                }
                let name = self.parse_qualified_name()?;
                if self.is(TokenKind::LParen) {
                    return self.parse_ident_call(name);
                }
                return Ok(ValueExpr::Ident { name });
            }
            TokenKind::SelfKw => {
                self.advance();
                if self.is(TokenKind::Dot) {
                    self.advance();
                    let name = self.consume(TokenKind::Ident)?.value;
                    return Ok(ValueExpr::SelfMember { name });
                }
                return Ok(ValueExpr::SelfRef);
            }
            _ => {}
        }
        if is_kw_call_start(t.kind) {
            let name = self.advance().value;
            if self.is(TokenKind::LParen) {
                return self.parse_ident_call(name);
            }
            return Err(self.err(format!("Expected ( after {}", name)));
        }
        Err(self.err(format!("Unexpected value start {:?}", t.kind)))
    }

    fn parse_paren_value(&mut self) -> Result<ValueExpr, PdlError> {
        self.consume(TokenKind::LParen)?;
        let first = self.consume(TokenKind::Ident)?.value;
        self.consume(TokenKind::Colon)?;
        if first == "duration" {
            return Err(self.err(
                "Write `Timing(duration:, ease: [, delay:])` — the `(duration:, ease:)` tuple is removed",
            ));
        }
        if first == "saturation" {
            return Err(self.err(
                "Naked `(saturation:, brightness:)` is not allowed; use `Vibrancy(saturation: …, brightness: …)`",
            ));
        }
        if first == "direction" {
            let dir = self.parse_value_expr()?;
            let direction = match dir {
                ValueExpr::DotEnum { value } => value,
                _ => return Err(self.err("Ramp direction must be dot-enum")),
            };
            self.consume(TokenKind::Comma)?;
            let stops_label = self.consume(TokenKind::Ident)?.value;
            if stops_label != "stops" {
                return Err(self.err("Expected stops after direction in ramp tuple"));
            }
            self.consume(TokenKind::Colon)?;
            self.consume(TokenKind::LBracket)?;
            let mut stops: Vec<ValueExpr> = Vec::new();
            if !self.is(TokenKind::RBracket) {
                loop {
                    stops.push(self.parse_value_expr()?);
                    if self.is(TokenKind::RBracket) {
                        break;
                    }
                    self.consume(TokenKind::Comma)?;
                }
            }
            self.consume(TokenKind::RBracket)?;
            self.consume(TokenKind::RParen)?;
            return Ok(ValueExpr::RampInline { direction, stops });
        }
        Err(self.err(format!("Unknown tuple starting with ({}:", first)))
    }

    fn parse_ident_call(&mut self, name: String) -> Result<ValueExpr, PdlError> {
        self.consume(TokenKind::LParen)?;
        if name == "EdgeInsets" {
            let fields = self.parse_labelled_args()?;
            self.consume(TokenKind::RParen)?;
            if fields.contains_key("x") && fields.contains_key("y") {
                return Ok(ValueExpr::EdgeInsets {
                    variant: EdgeInsetsVariant::Xy,
                    fields,
                });
            }
            if fields.contains_key("top")
                && fields.contains_key("right")
                && fields.contains_key("bottom")
                && fields.contains_key("left")
            {
                return Ok(ValueExpr::EdgeInsets {
                    variant: EdgeInsetsVariant::Trbl,
                    fields,
                });
            }
            return Err(self.err("EdgeInsets requires (x:, y:) or (top:, right:, bottom:, left:)"));
        }
        if name == "Corner" {
            let mut fields = self.parse_labelled_args()?;
            self.consume(TokenKind::RParen)?;
            let tl = fields.swap_remove("tl");
            let tr = fields.swap_remove("tr");
            let br = fields.swap_remove("br");
            let bl = fields.swap_remove("bl");
            match (tl, tr, br, bl) {
                (Some(tl), Some(tr), Some(br), Some(bl)) => {
                    return Ok(ValueExpr::Corner {
                        tl: Box::new(tl),
                        tr: Box::new(tr),
                        br: Box::new(br),
                        bl: Box::new(bl),
                    });
                }
                _ => return Err(self.err("Corner requires tl, tr, br, bl")),
            }
        }
        if name == "Shadow" {
            let mut fields = self.parse_labelled_args()?;
            self.consume(TokenKind::RParen)?;
            let x = fields.swap_remove("x");
            let y = fields.swap_remove("y");
            let blur_radius = fields.swap_remove("blurRadius");
            let color = fields.swap_remove("color");
            let spread = fields.swap_remove("spread");
            match (x, y, blur_radius, color) {
                (Some(x), Some(y), Some(blur_radius), Some(color)) => {
                    return Ok(ValueExpr::Shadow {
                        x: Box::new(x),
                        y: Box::new(y),
                        blur_radius: Box::new(blur_radius),
                        color: Box::new(color),
                        spread: spread.map(Box::new),
                    });
                }
                _ => {
                    return Err(
                        self.err("Shadow requires x, y, blurRadius, color (optional spread)")
                    );
                }
            }
        }
        if name == "Icon" {
            return Err(self.err(
                "`Icon(…)` is the World A frame constructor; asset refs use `IconRef(file: …)` or `IconRef(system: …, name: …)`",
            ));
        }
        if name == "IconRef" {
            let mut fields = self.parse_labelled_args()?;
            self.consume(TokenKind::RParen)?;
            let file = fields.swap_remove("file");
            let system = fields.swap_remove("system");
            let name_f = fields.swap_remove("name");
            match (file, system, name_f) {
                (Some(path), None, None) => {
                    return Ok(ValueExpr::IconFile {
                        path: Box::new(path),
                    });
                }
                (None, Some(system), Some(name_f)) => {
                    return Ok(ValueExpr::IconSystem {
                        system: Box::new(system),
                        name: Box::new(name_f),
                    });
                }
                _ => {
                    return Err(self.err(
                        "IconRef requires `file: \"…\"` or `system: .sfSymbols|.materialSymbols, name: \"…\"`",
                    ));
                }
            }
        }
        if name == "MediaSource" {
            let mut fields = self.parse_labelled_args()?;
            self.consume(TokenKind::RParen)?;
            let file = fields.swap_remove("file");
            let url = fields.swap_remove("url");
            let media_kind = fields.swap_remove("kind").map(Box::new);
            let format = fields.swap_remove("format").map(Box::new);
            if !fields.is_empty() {
                let unknown = fields.keys().cloned().collect::<Vec<_>>().join(", ");
                return Err(self.err(format!(
                    "MediaSource unknown label(s): {unknown} (expected file|url, optional kind, format)"
                )));
            }
            match (file, url) {
                (Some(path), None) => {
                    return Ok(ValueExpr::MediaSourceFile {
                        path: Box::new(path),
                        media_kind,
                        format,
                    });
                }
                (None, Some(url)) => {
                    return Ok(ValueExpr::MediaSourceUrl {
                        url: Box::new(url),
                        media_kind,
                        format,
                    });
                }
                _ => {
                    return Err(self.err(
                        "MediaSource requires `file: \"…\"` or `url: \"https://…\"` (optional `kind:`, `format:`)",
                    ));
                }
            }
        }
        if name == "GradientStop" {
            let fields = self.parse_labelled_args()?;
            self.consume(TokenKind::RParen)?;
            return Ok(ValueExpr::GradientStop { fields });
        }
        if name == "Timing" {
            let args = self.parse_labelled_args()?;
            self.consume(TokenKind::RParen)?;
            return finish_timing(args).map_err(|m| self.err(m));
        }
        if name == "Pose" {
            let args = self.parse_labelled_args()?;
            self.consume(TokenKind::RParen)?;
            return finish_pose(args).map_err(|m| self.err(m));
        }
        if name == "Stagger" {
            let args = self.parse_labelled_args()?;
            self.consume(TokenKind::RParen)?;
            return finish_stagger(args).map_err(|m| self.err(m));
        }
        if name == "Key" {
            let args = self.parse_labelled_args()?;
            self.consume(TokenKind::RParen)?;
            return finish_key(args).map_err(|m| self.err(m));
        }
        if name == "PresentationMotion" {
            let args = self.parse_labelled_args()?;
            self.consume(TokenKind::RParen)?;
            return finish_presentation_motion(args).map_err(|m| self.err(m));
        }
        if name == "Motion" {
            let base = if self.looks_like_motion_base() {
                let b = self.parse_value_expr()?;
                if self.is(TokenKind::Comma) {
                    self.consume(TokenKind::Comma)?;
                }
                Some(b)
            } else {
                None
            };
            let args = self.parse_labelled_args()?;
            self.consume(TokenKind::RParen)?;
            return finish_motion(base, args).map_err(|m| self.err(m));
        }
        if name == "Effect" {
            if self.is(TokenKind::RParen) {
                return Err(self
                    .err("`Effect(…)` requires a kind (`.blurSelf`, `.blurBehind`, or `.glass`)"));
            }
            let effect_kind = self.parse_value_expr()?;
            let args = if self.is(TokenKind::Comma) {
                self.consume(TokenKind::Comma)?;
                self.parse_labelled_args()?
            } else {
                indexmap::IndexMap::new()
            };
            self.consume(TokenKind::RParen)?;
            return finish_effect(effect_kind, args).map_err(|m| self.err(m));
        }
        if name == "Media" {
            return Err(self.err(
                "`Media(…)` is the World A frame constructor; layer fills use `MediaLayer(source:, contentMode: …)`",
            ));
        }
        let callee = match name.as_str() {
            "Color" => Some(CallCallee::Color),
            "Ramp" => Some(CallCallee::Ramp),
            "Blur" => Some(CallCallee::Blur),
            "MediaLayer" => Some(CallCallee::MediaLayer),
            "Vibrancy" => Some(CallCallee::Vibrancy),
            _ => None,
        };
        if let Some(callee) = callee {
            let args = self.parse_labelled_args()?;
            self.consume(TokenKind::RParen)?;
            if matches!(callee, CallCallee::Blur) {
                let has_radius = args.contains_key("radius");
                let has_blur = args.contains_key("blur");
                if has_blur && !has_radius {
                    return Err(self.err(
                        "`Blur(…)` takes `radius:` (a Radius / number), not `blur:`; e.g. `Blur(radius: 16)` or `Blur(radius: blurRadiusToken)`",
                    ));
                }
                if !has_radius {
                    return Err(
                        self.err("`Blur(…)` requires `radius:` (optional `style:`, `vibrancy:`)")
                    );
                }
                let unknown: Vec<_> = args
                    .keys()
                    .filter(|k| *k != "radius" && *k != "style" && *k != "vibrancy")
                    .cloned()
                    .collect();
                if !unknown.is_empty() {
                    return Err(self.err(format!(
                        "Blur unknown label(s): {} (expected radius, optional style, vibrancy)",
                        unknown.join(", ")
                    )));
                }
            }
            if matches!(callee, CallCallee::Vibrancy) {
                let has_sat = args.contains_key("saturation");
                let has_bri = args.contains_key("brightness");
                let has_wrap = args.contains_key("vibrancy");
                if has_wrap && !has_sat {
                    return Err(self.err(
                        "`Vibrancy(…)` takes `saturation:` and `brightness:` (e.g. `Vibrancy(saturation: 1.2, brightness: 1.05)`); bare Vibrancy tokens are layers — not `Vibrancy(vibrancy: …)`",
                    ));
                }
                if !has_sat || !has_bri {
                    return Err(self.err("`Vibrancy(…)` requires `saturation:` and `brightness:`"));
                }
                let unknown: Vec<_> = args
                    .keys()
                    .filter(|k| *k != "saturation" && *k != "brightness")
                    .cloned()
                    .collect();
                if !unknown.is_empty() {
                    return Err(self.err(format!(
                        "Vibrancy unknown label(s): {} (expected saturation, brightness)",
                        unknown.join(", ")
                    )));
                }
            }
            return Ok(ValueExpr::Call { callee, args });
        }
        if is_frame_ctor_name(&name) {
            return Err(self.err(format!(
                "`{name}(…)` is a World A frame constructor — use `let id = {name}(…)` or mount it in `children`, not as a value/layer expression"
            )));
        }
        // Component instance literal: Name() / Name(param: value, …)
        let kwargs = self.parse_labelled_args()?;
        self.consume(TokenKind::RParen)?;
        Ok(ValueExpr::Instance {
            component: name,
            kwargs,
        })
    }

    fn parse_labelled_args(&mut self) -> Result<indexmap::IndexMap<String, ValueExpr>, PdlError> {
        let mut args: indexmap::IndexMap<String, ValueExpr> = indexmap::IndexMap::new();
        if self.is(TokenKind::RParen) {
            return Ok(args);
        }
        loop {
            let lab = self.consume(TokenKind::Ident)?.value;
            self.consume(TokenKind::Colon)?;
            let value = self.parse_value_expr()?;
            args.insert(lab, value);
            if self.is(TokenKind::RParen) {
                break;
            }
            self.consume(TokenKind::Comma)?;
        }
        Ok(args)
    }

    /// `.aspect(…)` arg: number, `W:H` sugar, or Ratio token ident.
    fn parse_aspect_arg(&mut self) -> Result<ValueExpr, PdlError> {
        if self.is(TokenKind::Number) {
            let w_tok = self.consume(TokenKind::Number)?;
            if self.is(TokenKind::Colon) && self.peek_ahead_kind(1) == TokenKind::Number {
                self.advance();
                let h_tok = self.consume(TokenKind::Number)?;
                let width = self.num(&w_tok.value);
                let height = self.num(&h_tok.value);
                if !(height > 0.0) || !width.is_finite() || !height.is_finite() {
                    return Err(self.err(
                        "`.aspect(W:H)` requires a positive finite height (e.g. `.aspect(16:9)`)",
                    ));
                }
                return Ok(ValueExpr::Ratio { width, height });
            }
            let n = self.num(&w_tok.value);
            if !(n > 0.0) || !n.is_finite() {
                return Err(
                    self.err("`.aspect(n)` requires a positive finite ratio (width/height)")
                );
            }
            return Ok(ValueExpr::Number { value: n });
        }
        if self.is(TokenKind::Ident) {
            let name = self.parse_qualified_name()?;
            return Ok(ValueExpr::Ident { name });
        }
        Err(self.err(
            "`.aspect` expects a positive ratio number, `W:H` sugar, or a Ratio token (e.g. `.aspect(16:9)`)",
        ))
    }

    fn parse_flex_args(&mut self) -> Result<indexmap::IndexMap<String, ValueExpr>, PdlError> {
        let mut args: indexmap::IndexMap<String, ValueExpr> = indexmap::IndexMap::new();
        while !self.is(TokenKind::RParen) {
            let lab = self.consume(TokenKind::Ident)?.value;
            if lab != "min" && lab != "max" && lab != "preferred" {
                return Err(self.err(format!("Unknown flex arg {}", lab)));
            }
            self.consume(TokenKind::Colon)?;
            let value = self.parse_value_expr()?;
            args.insert(lab, value);
            if self.is(TokenKind::RParen) {
                break;
            }
            self.consume(TokenKind::Comma)?;
        }
        Ok(args)
    }

    /// `children = […]` or bare `children = chips` / `children = Tracks.focus.tracks`.
    fn parse_children_rhs(&mut self) -> Result<Vec<ChildEntry>, PdlError> {
        if self.is(TokenKind::Ident) && self.peek_ahead_kind(1) != TokenKind::LParen {
            let id = self.parse_qualified_name()?;
            let opacity = self.parse_optional_child_opacity()?;
            return Ok(vec![ChildEntry::FrameRef { id, opacity }]);
        }
        self.parse_children_list()
    }

    fn parse_children_list(&mut self) -> Result<Vec<ChildEntry>, PdlError> {
        self.consume(TokenKind::LBracket)?;
        let mut out: Vec<ChildEntry> = Vec::new();
        if !self.is(TokenKind::RBracket) {
            loop {
                out.push(self.parse_child_entry()?);
                if self.is(TokenKind::RBracket) {
                    break;
                }
                self.consume(TokenKind::Comma)?;
            }
        }
        self.consume(TokenKind::RBracket)?;
        Ok(out)
    }

    fn parse_child_entry(&mut self) -> Result<ChildEntry, PdlError> {
        if self.is(TokenKind::DotEnum) && self.peek().value == ".spacer" {
            return Err(
                self.err("`.spacer` was renamed to `Spacer()` (zero-arg child constructor)")
            );
        }
        if self.is(TokenKind::Effect) {
            return Err(self.err(
                "`Effect(…)` is a frame property, not a child — set `effect =` on a layout (or `blur = n` for self blur)",
            ));
        }
        // World A frame ctors: Ident (`Text`/`Layout`) or keywords (`Icon`/`Media`).
        if let Some(ctor) = self.peek_frame_ctor_name() {
            self.advance();
            self.consume(TokenKind::LParen)?;
            let (props, child_entries) = self.parse_frame_ctor_args()?;
            self.consume(TokenKind::RParen)?;
            let opacity = self.parse_optional_child_opacity()?;
            let frame_kind = frame_ctor_to_kind(ctor)
                .expect("peek_frame_ctor_name only returns known ctors")
                .to_string();
            let (props, child_entries) = if ctor == "Presenter" {
                let (box_props, root) = self.split_presenter_ctor_args(props, child_entries)?;
                (box_props, root.map(|entry| vec![entry]))
            } else {
                (props, child_entries)
            };
            return Ok(ChildEntry::FrameCtor {
                frame_kind,
                props,
                child_entries,
                opacity,
            });
        }
        if self.is(TokenKind::Ident) {
            let id = self.peek().value.clone();
            if self.peek_ahead_kind(1) == TokenKind::LParen {
                self.advance();
                self.consume(TokenKind::LParen)?;
                if id == "Spacer" {
                    if !self.is(TokenKind::RParen) {
                        return Err(self.err("`Spacer()` takes no arguments"));
                    }
                    self.consume(TokenKind::RParen)?;
                    if self.is(TokenKind::At) {
                        return Err(
                            self.err("`Spacer()` is not opacity-bearing; cannot apply postfix `@`")
                        );
                    }
                    return Ok(ChildEntry::Spacer);
                }
                let kwargs = self.parse_kw_args()?;
                self.consume(TokenKind::RParen)?;
                let opacity = self.parse_optional_child_opacity()?;
                return Ok(ChildEntry::Instance {
                    component: id,
                    kwargs,
                    opacity,
                });
            }
            // Frame id, list param, or sample path (`Tracks.focus.tracks`).
            let id = self.parse_qualified_name()?;
            let opacity = self.parse_optional_child_opacity()?;
            return Ok(ChildEntry::FrameRef { id, opacity });
        }
        Err(self.err("Invalid child entry"))
    }

    /// Peek a World A frame ctor name when the next token is `Name(`.
    fn peek_frame_ctor_name(&self) -> Option<&'static str> {
        let t = self.peek();
        let name = match t.kind {
            TokenKind::Ident => t.value.as_str(),
            TokenKind::Icon => "Icon",
            TokenKind::Media => "Media",
            _ => return None,
        };
        if !is_frame_ctor_name(name) {
            return None;
        }
        if self.peek_ahead_kind(1) != TokenKind::LParen {
            return None;
        }
        frame_ctor_to_kind(name).map(|_| match name {
            "Text" => "Text",
            "Layout" => "Layout",
            "Icon" => "Icon",
            "Media" => "Media",
            "Presenter" => "Presenter",
            _ => unreachable!(),
        })
    }

    fn split_presenter_ctor_args(
        &self,
        props: indexmap::IndexMap<String, ValueExpr>,
        child_entries: Option<Vec<ChildEntry>>,
    ) -> Result<(indexmap::IndexMap<String, ValueExpr>, Option<ChildEntry>), PdlError> {
        if child_entries.is_some() {
            return Err(self.err_code(
                "PDL-E054",
                "Presenter takes `root:`, not `children:` — it paints one destination",
            ));
        }
        let mut root = None;
        let mut box_props = indexmap::IndexMap::new();
        for (k, v) in props {
            if k == "children" {
                return Err(self.err_code(
                    "PDL-E054",
                    "Presenter takes `root:`, not `children:` — it paints one destination",
                ));
            }
            if k == "root" {
                root = Some(v);
            } else {
                box_props.insert(k, v);
            }
        }
        let Some(root) = root else {
            return Ok((box_props, None));
        };
        let entry = match root {
            ValueExpr::Ident { name } => ChildEntry::FrameRef {
                id: name,
                opacity: None,
            },
            ValueExpr::Instance {
                component, kwargs, ..
            } => ChildEntry::Instance {
                component,
                kwargs,
                opacity: None,
            },
            _ => {
                return Err(self.err_code(
                    "PDL-E054",
                    "Presenter `root` must be a page let or a page instance (`Home()` / `home`)",
                ));
            }
        };
        Ok((box_props, Some(entry)))
    }

    fn presenter_ctor_body(
        &self,
        props: indexmap::IndexMap<String, ValueExpr>,
        child_entries: Option<Vec<ChildEntry>>,
    ) -> Result<Vec<FrameBodyItem>, PdlError> {
        let (box_props, root) = self.split_presenter_ctor_args(props, child_entries)?;
        Ok(frame_ctor_kwargs_to_body(
            &box_props,
            root.map(|entry| vec![entry]),
        ))
    }

    /// Frame ctor kwargs; `children:` is a child-entry list, not a ValueExpr.
    fn parse_frame_ctor_args(
        &mut self,
    ) -> Result<
        (
            indexmap::IndexMap<String, ValueExpr>,
            Option<Vec<ChildEntry>>,
        ),
        PdlError,
    > {
        let mut props: indexmap::IndexMap<String, ValueExpr> = indexmap::IndexMap::new();
        let mut child_entries: Option<Vec<ChildEntry>> = None;
        if self.is(TokenKind::RParen) {
            return Ok((props, None));
        }
        loop {
            let lab = self.consume_frame_field_name()?;
            self.consume(TokenKind::Colon)?;
            if lab == "children" {
                child_entries = Some(self.parse_children_list()?);
            } else {
                props.insert(lab, self.parse_value_expr()?);
            }
            if self.is(TokenKind::RParen) {
                break;
            }
            self.consume(TokenKind::Comma)?;
        }
        Ok((props, child_entries))
    }

    fn consume_frame_field_name(&mut self) -> Result<String, PdlError> {
        if self.is(TokenKind::Ident) {
            return Ok(self.consume(TokenKind::Ident)?.value);
        }
        if self.is(TokenKind::Animate) {
            return Ok(self.advance().value);
        }
        Err(self.err(format!(
            "Expected frame property name, got {:?}",
            self.peek().kind
        )))
    }

    fn peek_ahead_kind(&self, n: usize) -> TokenKind {
        self.tokens
            .get(self.index + n)
            .map(|t| t.kind)
            .unwrap_or(TokenKind::Eof)
    }

    /// Trailing `emits {` / `emits <P>` / `emits(propagation: …) {` — not `emits(…) Name {`.
    fn is_trailing_emits(&self) -> bool {
        if !self.is(TokenKind::Emits) {
            return false;
        }
        match self.peek_ahead_kind(1) {
            TokenKind::LBrace | TokenKind::Lt => true,
            TokenKind::LParen => {
                let mut depth = 0;
                let mut i = 1;
                loop {
                    match self.peek_ahead_kind(i) {
                        TokenKind::Eof => return false,
                        TokenKind::LParen => depth += 1,
                        TokenKind::RParen => {
                            depth -= 1;
                            if depth == 0 {
                                return self.peek_ahead_kind(i + 1) == TokenKind::LBrace;
                            }
                        }
                        _ => {}
                    }
                    i += 1;
                }
            }
            _ => false,
        }
    }

    /// `Motion(motion.hoverPop, …)` — ident path followed by `,` or `)`, not `label:`.
    fn looks_like_motion_base(&self) -> bool {
        if !self.is(TokenKind::Ident) {
            return false;
        }
        let mut i = 1;
        while self.peek_ahead_kind(i) == TokenKind::Dot
            && self.peek_ahead_kind(i + 1) == TokenKind::Ident
        {
            i += 2;
        }
        matches!(
            self.peek_ahead_kind(i),
            TokenKind::Comma | TokenKind::RParen
        )
    }

    fn parse_kw_args(&mut self) -> Result<indexmap::IndexMap<String, ValueExpr>, PdlError> {
        let mut kwargs: indexmap::IndexMap<String, ValueExpr> = indexmap::IndexMap::new();
        if self.is(TokenKind::RParen) {
            return Ok(kwargs);
        }
        loop {
            let k = self.consume(TokenKind::Ident)?.value;
            self.consume(TokenKind::Colon)?;
            let value = self.parse_value_expr()?;
            kwargs.insert(k, value);
            if self.is(TokenKind::RParen) {
                break;
            }
            self.consume(TokenKind::Comma)?;
        }
        Ok(kwargs)
    }

    fn is(&self, kind: TokenKind) -> bool {
        self.peek().kind == kind
    }

    fn peek(&self) -> &Token {
        self.tokens.get(self.index).unwrap_or(&self.eof)
    }

    fn advance(&mut self) -> Token {
        let t = self.peek().clone();
        if t.kind != TokenKind::Eof {
            self.index += 1;
        }
        t
    }

    /// Host / component param names are normally IDENT. `previewBackground` is
    /// also a top-level keyword (Q5 — host param of the same name).
    fn consume_param_name(&mut self) -> Result<String, PdlError> {
        let t = self.peek().clone();
        if t.kind == TokenKind::Ident {
            self.advance();
            return Ok(t.value);
        }
        if t.kind == TokenKind::PreviewBackground {
            self.advance();
            return Ok("previewBackground".to_string());
        }
        Err(self.err(format!("Expected parameter name, got {:?}", t.kind)))
    }

    /// Usage keys are normally IDENT; `description` is also a keyword for
    /// `Rule(..., description: …)`.
    fn consume_usage_prop_key(&mut self) -> Result<String, PdlError> {
        let t = self.peek().clone();
        if t.kind == TokenKind::Ident {
            self.advance();
            return Ok(t.value);
        }
        if t.kind == TokenKind::Description {
            self.advance();
            return Ok("description".to_string());
        }
        Err(self.err(format!("Expected usage property key, got {:?}", t.kind)))
    }

    fn consume(&mut self, kind: TokenKind) -> Result<Token, PdlError> {
        let t = self.peek().clone();
        if t.kind != kind {
            return Err(self.err(format!("Expected {:?}, got {:?}", kind, t.kind)));
        }
        self.advance();
        Ok(t)
    }

    fn err_use_outside_mount(&self) -> PdlError {
        self.err_code(
            "PDL-E047",
            "`use catalog` is only valid inside a `mount` body",
        )
    }

    fn err_code(&self, code: &str, msg: impl Into<String>) -> PdlError {
        let t = self.peek();
        PdlError::new(
            code,
            msg,
            Some(self.file_path.clone()),
            Some(t.line),
            Some(t.column),
        )
    }

    fn err(&self, msg: impl Into<String>) -> PdlError {
        self.err_code("PDL-E001", msg)
    }

    /// `Number(...)` semantics: parse as f64, yielding NaN on malformed input
    /// (the lexer guarantees well-formed numeric literals in practice).
    fn num(&self, s: &str) -> f64 {
        s.parse::<f64>().unwrap_or(f64::NAN)
    }
}

fn is_type_keyword(kind: TokenKind) -> bool {
    matches!(
        kind,
        TokenKind::Color
            | TokenKind::Opacity
            | TokenKind::Distance
            | TokenKind::Radius
            | TokenKind::Shadow
            | TokenKind::Icon
            | TokenKind::MediaSource
            | TokenKind::Ratio
            | TokenKind::FontFamily
            | TokenKind::Size
            | TokenKind::Weight
            | TokenKind::LineHeight
            | TokenKind::LetterSpacing
            | TokenKind::Sizing
            | TokenKind::Duration
            | TokenKind::Ease
            | TokenKind::Timing
            | TokenKind::Pose
            | TokenKind::Stagger
            | TokenKind::Motion
            | TokenKind::Effect
            | TokenKind::Blur
            | TokenKind::Vibrancy
            | TokenKind::Ramp
            | TokenKind::Background
            | TokenKind::Foreground
            | TokenKind::EdgeInsets
            | TokenKind::CornerRadii
            | TokenKind::GradientStop
            | TokenKind::Media
            | TokenKind::BlurStyle
    )
}

fn is_kw_call_start(kind: TokenKind) -> bool {
    matches!(
        kind,
        TokenKind::EdgeInsets
            | TokenKind::Corner
            | TokenKind::Shadow
            | TokenKind::Icon
            | TokenKind::MediaSource
            | TokenKind::GradientStop
            | TokenKind::Color
            | TokenKind::Ramp
            | TokenKind::Blur
            | TokenKind::Media
            | TokenKind::Vibrancy
            | TokenKind::Pose
            | TokenKind::Stagger
            | TokenKind::Motion
            | TokenKind::Timing
            | TokenKind::Effect
    )
}

fn finish_timing(mut args: indexmap::IndexMap<String, ValueExpr>) -> Result<ValueExpr, String> {
    if args.contains_key("easing") {
        return Err("Write `ease:` (Timing), not `easing:`".to_string());
    }
    let duration = args
        .swap_remove("duration")
        .ok_or_else(|| "`Timing(…)` requires `duration:`".to_string())?;
    let ease = args
        .swap_remove("ease")
        .ok_or_else(|| "`Timing(…)` requires `ease:`".to_string())?;
    let delay = args.swap_remove("delay");
    if !args.is_empty() {
        let unknown = args.keys().cloned().collect::<Vec<_>>().join(", ");
        return Err(format!(
            "Timing unknown label(s): {unknown} (expected duration, ease, optional delay)"
        ));
    }
    Ok(ValueExpr::Timing {
        duration: Box::new(duration),
        ease: Box::new(ease),
        delay: delay.map(Box::new),
    })
}

fn finish_pose(args: indexmap::IndexMap<String, ValueExpr>) -> Result<ValueExpr, String> {
    let unknown: Vec<_> = args
        .keys()
        .filter(|k| !is_motion_prop_name(k))
        .cloned()
        .collect();
    if !unknown.is_empty() {
        return Err(format!(
            "Pose unknown label(s): {} (expected {})",
            unknown.join(", "),
            MOTION_PROP_NAMES.join(", ")
        ));
    }
    if args.is_empty() {
        return Err(
            "`Pose(…)` requires at least one overlay field (opacity, scale, translateY, …)"
                .to_string(),
        );
    }
    Ok(ValueExpr::Pose { props: args })
}

fn finish_stagger(mut args: indexmap::IndexMap<String, ValueExpr>) -> Result<ValueExpr, String> {
    let step = args
        .swap_remove("step")
        .ok_or_else(|| "`Stagger(…)` requires `step:` (a Duration / milliseconds)".to_string())?;
    let from = args.swap_remove("from");
    if !args.is_empty() {
        let unknown = args.keys().cloned().collect::<Vec<_>>().join(", ");
        return Err(format!(
            "Stagger unknown label(s): {unknown} (expected step, optional from)"
        ));
    }
    if let Some(ref f) = from {
        match f {
            ValueExpr::DotEnum { value } => {
                let raw = value.strip_prefix('.').unwrap_or(value.as_str());
                if raw != "first" && raw != "last" {
                    return Err("`Stagger` `from:` must be `.first` or `.last`".to_string());
                }
            }
            _ => return Err("`Stagger` `from:` must be `.first` or `.last`".to_string()),
        }
    }
    Ok(ValueExpr::Stagger {
        step: Box::new(step),
        from: from.map(Box::new),
    })
}

fn finish_key(mut args: indexmap::IndexMap<String, ValueExpr>) -> Result<ValueExpr, String> {
    let pose = args.swap_remove("pose").ok_or_else(|| {
        "`Key(…)` requires `pose:` and `at:` (0…1 of transition.duration)".to_string()
    })?;
    let at = args.swap_remove("at").ok_or_else(|| {
        "`Key(…)` requires `pose:` and `at:` (0…1 of transition.duration)".to_string()
    })?;
    if args.contains_key("easing") {
        return Err("Write `ease:` on Key, not `easing:`".to_string());
    }
    let ease = args.swap_remove("ease");
    if !args.is_empty() {
        let unknown = args.keys().cloned().collect::<Vec<_>>().join(", ");
        return Err(format!(
            "Key unknown label(s): {unknown} (expected pose, at, optional ease)"
        ));
    }
    let rest = matches!(
        &pose,
        ValueExpr::DotEnum { value } if value.trim_start_matches('.') == "rest"
    );
    if !matches!(pose, ValueExpr::Pose { .. } | ValueExpr::Ident { .. }) && !rest {
        return Err("`Key` `pose:` must be a Pose, a Pose token, or `.rest`".to_string());
    }
    Ok(ValueExpr::Key {
        pose: Box::new(pose),
        at: Box::new(at),
        ease: ease.map(Box::new),
    })
}

fn finish_motion(
    base: Option<ValueExpr>,
    mut args: indexmap::IndexMap<String, ValueExpr>,
) -> Result<ValueExpr, String> {
    if args.contains_key("transition") {
        return Err("Write `timing:` (a Timing) or flattened `duration:` / `ease:`, not `transition:`".to_string());
    }
    if args.contains_key("easing") {
        return Err("Write `ease:`, not `easing:`".to_string());
    }
    let timing = args.swap_remove("timing");
    let duration = args.swap_remove("duration");
    let ease = args.swap_remove("ease");
    let delay = args.swap_remove("delay");
    if timing.is_some() && (duration.is_some() || ease.is_some() || delay.is_some()) {
        return Err("`Motion` cannot take `timing:` and flattened `duration:` / `ease:` / `delay:`".to_string());
    }
    let clock = if let Some(t) = timing {
        Some(t)
    } else if duration.is_some() || ease.is_some() || delay.is_some() {
        let dur = duration.ok_or_else(|| {
            "`Motion` flattened clock needs `duration:` (and usually `ease:`)".to_string()
        })?;
        let ez = ease.ok_or_else(|| "`Motion` flattened clock needs `ease:`".to_string())?;
        Some(ValueExpr::Timing {
            duration: Box::new(dur),
            ease: Box::new(ez),
            delay: delay.map(Box::new),
        })
    } else {
        None
    };
    if base.is_none() && clock.is_none() {
        return Err("`Motion(…)` requires `duration:` / `ease:` (optional `delay:`) or `timing:` (a Timing token or `Timing(…)`)".to_string());
    }
    let pose = args.swap_remove("pose");
    let keys = args.swap_remove("keys");
    let play = args.swap_remove("play");
    let repeat = args.swap_remove("repeat");
    let stagger = args.swap_remove("stagger");
    if !args.is_empty() {
        let unknown = args.keys().cloned().collect::<Vec<_>>().join(", ");
        return Err(format!(
            "Motion unknown label(s): {unknown} (expected timing or duration/ease/delay, optional play, pose, keys, stagger, repeat)"
        ));
    }
    Ok(ValueExpr::Motion {
        base: base.map(Box::new),
        timing: clock.map(Box::new),
        pose: pose.map(Box::new),
        keys: keys.map(Box::new),
        play: play.map(Box::new),
        repeat: repeat.map(Box::new),
        stagger: stagger.map(Box::new),
    })
}

fn finish_effect(
    effect_kind: ValueExpr,
    mut args: indexmap::IndexMap<String, ValueExpr>,
) -> Result<ValueExpr, String> {
    let ValueExpr::DotEnum { value } = &effect_kind else {
        return Err(
            "`Effect(…)` first argument must be `.blurSelf`, `.blurBehind`, or `.glass`"
                .to_string(),
        );
    };
    let raw = value.strip_prefix('.').unwrap_or(value.as_str());
    if raw != "blurSelf" && raw != "blurBehind" && raw != "glass" {
        return Err("`Effect(…)` kind must be `.blurSelf`, `.blurBehind`, or `.glass`".to_string());
    }
    let unknown: Vec<_> = args
        .keys()
        .filter(|k| *k != "radius" && *k != "vibrancy")
        .cloned()
        .collect();
    if !unknown.is_empty() {
        return Err(format!(
            "Effect unknown label(s): {} (expected optional radius, vibrancy)",
            unknown.join(", ")
        ));
    }
    if (raw == "blurSelf" || raw == "blurBehind") && !args.contains_key("radius") {
        return Err(format!(
            "`Effect(.{raw})` requires `radius:` (a Radius / number)"
        ));
    }
    let radius = args.swap_remove("radius");
    let vibrancy = args.swap_remove("vibrancy");
    Ok(ValueExpr::Effect {
        effect_kind: Box::new(effect_kind),
        radius: radius.map(Box::new),
        vibrancy: vibrancy.map(Box::new),
    })
}

fn finish_presentation_motion(
    mut args: indexmap::IndexMap<String, ValueExpr>,
) -> Result<ValueExpr, String> {
    let incoming = args
        .swap_remove("incoming")
        .ok_or_else(|| "`PresentationMotion` requires `incoming:`".to_string())?;
    let outgoing = args
        .swap_remove("outgoing")
        .ok_or_else(|| "`PresentationMotion` requires `outgoing:`".to_string())?;
    let duration = args.swap_remove("duration");
    let ease = args.swap_remove("ease");
    let delay = args.swap_remove("delay");
    let front = args.swap_remove("front");
    if args.contains_key("promoteAt") {
        return Err("Write `switchAt:` (0…1), not `promoteAt:`".to_string());
    }
    let switch_at = args.swap_remove("switchAt");
    if !args.is_empty() {
        let unknown = args.keys().cloned().collect::<Vec<_>>().join(", ");
        return Err(format!(
            "PresentationMotion unknown label(s): {unknown} (expected incoming, outgoing, optional duration, ease, delay, front, switchAt)"
        ));
    }
    Ok(ValueExpr::PresentationMotion {
        incoming: Box::new(incoming),
        outgoing: Box::new(outgoing),
        duration: duration.map(Box::new),
        ease: ease.map(Box::new),
        delay: delay.map(Box::new),
        front: front.map(Box::new),
        switch_at: switch_at.map(Box::new),
    })
}

/// Lift `self.<channel> = { … }` items out of a kind body into interaction handlers.
fn extract_host_handlers(body: &mut Vec<FrameBodyItem>) -> Vec<InteractionHandler> {
    let mut handlers = Vec::new();
    let mut rest = Vec::new();
    for item in std::mem::take(body) {
        match item {
            FrameBodyItem::HostHandler { event, body } => {
                handlers.push(InteractionHandler { event, body });
            }
            other => rest.push(other),
        }
    }
    *body = rest;
    handlers
}

pub fn parse_module_source(source: &str, path: &str) -> Result<ModuleAst, PdlError> {
    let tokens = tokenize(source, path)?;
    let mut p = Parser::new(tokens, path.to_string());
    p.parse_module()
}
