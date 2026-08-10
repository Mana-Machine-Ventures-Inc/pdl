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
//!   `Description`, `Animate`, `From`, `To`, `Stagger`, `StaggerFrom`, `Where`,
//!   `Tags`, and the type/call keywords `EdgeInsets`, `Corner`, `GradientStop`,
//!   `Color`, `Opacity`, `Distance`, `Radius`, `Shadow`, `Icon`, `MediaSource`,
//!   `Ratio`, `FontFamily`, `Size`, `Weight`, `LineHeight`, `LetterSpacing`,
//!   `Sizing`, `Duration`, `Easing`,
//!   `Transition`, `Ramp`, `Blur`, `Media`, `Vibrancy`, `Background`,
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
use crate::frame_props::is_frame_enum_type_name;
use crate::lexer::{tokenize, Token, TokenKind};

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
                // Trailing `} emits { … }` after the component.
                if self.is(TokenKind::Emits) && self.peek_ahead_kind(1) == TokenKind::LBrace {
                    declarations.push(TopLevelDecl::Emits(self.parse_inline_emits(name)?));
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
            TokenKind::TypeStyle => Ok(TopLevelDecl::TypeStyle(self.parse_type_style()?)),
            TokenKind::Variant => Ok(TopLevelDecl::Variant(self.parse_variant()?)),
            TokenKind::Protocol => Ok(TopLevelDecl::Protocol(self.parse_protocol()?)),
            TokenKind::Component => Ok(TopLevelDecl::Component(self.parse_component()?)),
            TokenKind::Expose => Err(self.err_code(
                "PDL-E001",
                "`expose` was removed from PDL; all component parameters are public (use `emits` for output)",
            )),
            TokenKind::Interaction => Err(self.err_interaction_removed()),
            TokenKind::Emits => Ok(TopLevelDecl::Emits(self.parse_emits_decl()?)),
            TokenKind::Fixtures => Ok(TopLevelDecl::Fixtures(self.parse_fixtures()?)),
            TokenKind::Usage => Ok(TopLevelDecl::Usage(self.parse_usage()?)),
            TokenKind::Rules => Ok(TopLevelDecl::Rules(self.parse_rules()?)),
            TokenKind::Extend => Ok(TopLevelDecl::Extend(self.parse_extend()?)),
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

    fn consume_frame_kind_keyword(&mut self) -> Result<String, PdlError> {
        let t = self.peek().clone();
        if t.kind != TokenKind::Ident {
            return Err(self.err(format!(
                "Expected frame kind layout|text|icon|media, got {:?}",
                t.kind
            )));
        }
        let v = t.value;
        if v == "layout" || v == "text" || v == "icon" || v == "media" {
            self.advance();
            return Ok(v);
        }
        Err(self.err(format!(
            "Expected frame kind layout|text|icon|media, got IDENT {}",
            v
        )))
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

    /// Inline trailing block: `emits { select(filter: FilterId) … }` after a component.
    fn parse_inline_emits(&mut self, component: String) -> Result<EmitsDecl, PdlError> {
        self.consume(TokenKind::Emits)?;
        self.consume(TokenKind::LBrace)?;
        let emits = self.parse_emits_list_body()?;
        self.consume(TokenKind::RBrace)?;
        Ok(EmitsDecl { component, emits })
    }

    fn parse_emits_list_body(&mut self) -> Result<Vec<ProtocolEmitDecl>, PdlError> {
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
            emits.push(ProtocolEmitDecl { name, args });
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
        let component = self.consume(TokenKind::Ident)?.value;
        self.consume(TokenKind::LBrace)?;
        let emits = self.parse_emits_list_body()?;
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
            if self.is(TokenKind::From)
                || self.is(TokenKind::To)
                || self.is(TokenKind::Stagger)
                || self.is(TokenKind::StaggerFrom)
            {
                return Err(self.err(
                    "from/to/stagger in interaction handlers are not implemented yet",
                ));
            }
            let param = if self.is(TokenKind::SelfKw) {
                self.advance();
                self.consume(TokenKind::Dot)?;
                self.consume(TokenKind::Ident)?.value
            } else {
                self.consume(TokenKind::Ident)?.value
            };
            // Host verb: `beginEditing(value)` / `cancelEditing()`
            if self.is(TokenKind::LParen) {
                self.advance();
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
                items.push(InteractionHandlerItem::HostVerb {
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
        while !self.is(TokenKind::RBrace) {
            let pname = self.consume(TokenKind::Ident)?.value;
            self.consume(TokenKind::Eq)?;
            bindings.push(FixtureBinding {
                name: pname,
                value: self.parse_value_expr()?,
            });
        }
        self.consume(TokenKind::RBrace)?;
        Ok(FixtureExampleDecl { label, bindings })
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
                if pick.kind == TokenKind::Ident && (pick.value == "first" || pick.value == "last") {
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

    fn parse_rule_chain_from_axis(
        &mut self,
        axis: NavAxis,
        mut where_tags: Vec<String>,
    ) -> Result<RuleQueryParsed, PdlError> {
        let mut terminal = RuleChainTerminalParsed::Exists;
        while self.is(TokenKind::Dot) {
            self.advance();
            if self.is(TokenKind::Where) {
                self.advance();
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
            if self.is(TokenKind::Ident) && self.peek().value == "exists" {
                self.advance();
                terminal = RuleChainTerminalParsed::Exists;
                break;
            }
            if self.is(TokenKind::Ident) && self.peek().value == "count" {
                self.advance();
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
            if self.is(TokenKind::Ident) {
                let rel = self.peek().value.clone();
                let relation = match rel.as_str() {
                    "precedes" => Some(OrderingRelation::Precedes),
                    "follows" => Some(OrderingRelation::Follows),
                    "adjacentTo" => Some(OrderingRelation::AdjacentTo),
                    _ => None,
                };
                if let Some(relation) = relation {
                    self.advance();
                    self.consume(TokenKind::LParen)?;
                    self.consume(TokenKind::SelfKw)?;
                    self.consume(TokenKind::RParen)?;
                    terminal = RuleChainTerminalParsed::Ordering {
                        relation,
                        r#ref: OrderingRef::SelfRef,
                    };
                    break;
                }
            }
            return Err(self.err(format!(
                "Unexpected rule query token {:?}",
                self.peek().kind
            )));
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
            return Err(self.err(format!(
                "Unexpected extend section {:?}",
                self.peek().kind
            )));
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
                CallCallee::Media => "Media",
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
        self.consume(TokenKind::LBrace)?;
        let emits = self.parse_emits_list_body()?;
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
        }
        Ok(ProtocolDecl {
            name,
            role,
            requires,
            params,
            emits,
        })
    }

    fn parse_component(&mut self) -> Result<ComponentDecl, PdlError> {
        self.consume(TokenKind::Component)?;
        let name = self.consume(TokenKind::Ident)?.value;
        // Optional `component Name <Protocol>(…)`
        let conforms_to = if self.is(TokenKind::Lt) {
            self.advance();
            let proto = self.consume(TokenKind::Ident)?.value;
            self.consume(TokenKind::Gt)?;
            Some(proto)
        } else {
            None
        };
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
        let body = self.parse_frame_body_until_close()?;
        self.consume(TokenKind::RBrace)?;
        Ok(ComponentDecl {
            name,
            conforms_to,
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

        // Host inbound: `self.pressEnd = { … }` (`self.` optional / clarifying)
        if self.is(TokenKind::SelfKw) {
            self.advance();
            self.consume(TokenKind::Dot)?;
            let event = self.consume(TokenKind::Ident)?.value;
            self.consume(TokenKind::Eq)?;
            self.consume(TokenKind::LBrace)?;
            let body = self.parse_interaction_handler_body()?;
            self.consume(TokenKind::RBrace)?;
            return Ok(FrameBodyItem::HostHandler { event, body });
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
                return Ok(FrameBodyItem::HostHandler {
                    event: name,
                    body,
                });
            }
            self.advance();
            if self.is(TokenKind::Dot) {
                self.consume(TokenKind::Dot)?;
                let field = self.consume(TokenKind::Ident)?.value;
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
        let mut binds = indexmap::IndexMap::new();
        let mut handlers = Vec::new();
        while !self.is(TokenKind::RBrace) {
            if self.is(TokenKind::On) {
                return Err(self.err(format!(
                    "Layout `on` is not allowed inside ForEach; use \
                     `{item}.channel(…) = {{ … }}` for declared emit capture (§4e)."
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
                handlers.push(handler);
                continue;
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
            binds.insert(param, value);
        }
        self.consume(TokenKind::RBrace)?;
        Ok(FrameBodyItem::ForEach {
            list,
            item,
            binds,
            handlers,
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
            let param = if self.is(TokenKind::SelfKw) {
                self.advance();
                self.consume(TokenKind::Dot)?;
                self.consume(TokenKind::Ident)?.value
            } else {
                self.consume(TokenKind::Ident)?.value
            };
            self.consume(TokenKind::Eq)?;
            let value = self.parse_value_expr()?;
            body.push(LayoutOnAssign { param, value });
        }
        self.consume(TokenKind::RBrace)?;
        Ok(LayoutOnHandler {
            qualifier,
            channel,
            payload,
            body,
        })
    }

    fn parse_let(&mut self) -> Result<FrameBodyItem, PdlError> {
        self.consume(TokenKind::Let)?;
        let id = self.consume(TokenKind::Ident)?.value;
        if self.is(TokenKind::Eq) {
            self.advance();
            let comp = self.consume(TokenKind::Ident)?.value;
            self.consume(TokenKind::LParen)?;
            let kwargs = self.parse_kw_args()?;
            self.consume(TokenKind::RParen)?;
            return Ok(FrameBodyItem::LetInstance {
                id,
                component: comp,
                kwargs,
            });
        }
        self.consume(TokenKind::Colon)?;
        let frame_kind = self.consume_frame_kind_keyword()?;
        self.consume(TokenKind::Eq)?;
        self.consume(TokenKind::LBrace)?;
        let body = self.parse_frame_body_until_close()?;
        self.consume(TokenKind::RBrace)?;
        Ok(FrameBodyItem::Let {
            id,
            frame_kind,
            body,
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
        if self.is(TokenKind::At) {
            self.advance();
            let op = self.parse_primary_value()?;
            return Ok(ValueExpr::OpacityOf {
                base: Box::new(lhs),
                opacity: Box::new(op),
            });
        }
        Ok(lhs)
    }

    fn parse_primary_value(&mut self) -> Result<ValueExpr, PdlError> {
        let t = self.peek().clone();
        match t.kind {
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
                        return Err(self.err(
                            "`.fixed` expects a Distance number (px), e.g. `.fixed(48)`",
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
                if v == ".flex" {
                    if !self.is(TokenKind::LParen) {
                        return Err(self.err(
                            "`.flex` requires arguments, e.g. `.flex(min: 8, max: 120)`",
                        ));
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
                // Qualified frame enum: `Justify.center` → same AST as `.center`
                // (Sizing.* stays on the Sizing keyword branch above.)
                if is_frame_enum_type_name(&t.value)
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
            let duration = self.parse_value_expr()?;
            self.consume(TokenKind::Comma)?;
            self.consume(TokenKind::Ident)?;
            self.consume(TokenKind::Colon)?;
            let easing = self.parse_value_expr()?;
            let mut delay: Option<Box<ValueExpr>> = None;
            if self.is(TokenKind::Comma) {
                self.advance();
                let lab = self.consume(TokenKind::Ident)?.value;
                if lab != "delay" {
                    return Err(self.err("Expected delay in transition"));
                }
                self.consume(TokenKind::Colon)?;
                delay = Some(Box::new(self.parse_value_expr()?));
            }
            self.consume(TokenKind::RParen)?;
            return Ok(ValueExpr::Transition {
                duration: Box::new(duration),
                easing: Box::new(easing),
                delay,
            });
        }
        if first == "saturation" {
            let sat = self.parse_value_expr()?;
            self.consume(TokenKind::Comma)?;
            self.consume(TokenKind::Ident)?;
            self.consume(TokenKind::Colon)?;
            let bright = self.parse_value_expr()?;
            self.consume(TokenKind::RParen)?;
            let (saturation, brightness) = match (&sat, &bright) {
                (ValueExpr::Number { value: s }, ValueExpr::Number { value: b }) => (*s, *b),
                _ => {
                    return Err(
                        self.err("Vibrancy tuple expects numeric saturation/brightness")
                    );
                }
            };
            return Ok(ValueExpr::VibrancyTuple {
                saturation,
                brightness,
            });
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
            return Err(
                self.err("EdgeInsets requires (x:, y:) or (top:, right:, bottom:, left:)")
            );
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
                    return Err(self.err(
                        "Shadow requires x, y, blurRadius, color (optional spread)",
                    ));
                }
            }
        }
        if name == "Icon" {
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
                        "Icon requires `file: \"…\"` or `system: .sfSymbols|.materialSymbols, name: \"…\"`",
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
        let callee = match name.as_str() {
            "Color" => Some(CallCallee::Color),
            "Ramp" => Some(CallCallee::Ramp),
            "Blur" => Some(CallCallee::Blur),
            "Media" => Some(CallCallee::Media),
            "Vibrancy" => Some(CallCallee::Vibrancy),
            _ => None,
        };
        if let Some(callee) = callee {
            let args = self.parse_labelled_args()?;
            self.consume(TokenKind::RParen)?;
            return Ok(ValueExpr::Call { callee, args });
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
                return Err(self.err(
                    "`.aspect(n)` requires a positive finite ratio (width/height)",
                ));
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

    /// `children = […]` or bare `children = chips` (§4b / §4e sugar).
    fn parse_children_rhs(&mut self) -> Result<Vec<ChildEntry>, PdlError> {
        if self.is(TokenKind::Ident) && self.peek_ahead_kind(1) != TokenKind::LParen {
            let id = self.consume(TokenKind::Ident)?.value;
            return Ok(vec![ChildEntry::FrameRef { id }]);
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
            self.advance();
            return Ok(ChildEntry::Spacer);
        }
        if self.is(TokenKind::Ident) {
            let id = self.peek().value.clone();
            if self.peek_ahead_kind(1) == TokenKind::LParen {
                self.advance();
                self.consume(TokenKind::LParen)?;
                let kwargs = self.parse_kw_args()?;
                self.consume(TokenKind::RParen)?;
                return Ok(ChildEntry::Instance {
                    component: id,
                    kwargs,
                });
            }
            self.advance();
            return Ok(ChildEntry::FrameRef { id });
        }
        Err(self.err("Invalid child entry"))
    }

    fn peek_ahead_kind(&self, n: usize) -> TokenKind {
        self.tokens
            .get(self.index + n)
            .map(|t| t.kind)
            .unwrap_or(TokenKind::Eof)
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
            | TokenKind::Easing
            | TokenKind::Transition
            | TokenKind::Blur
            | TokenKind::Vibrancy
            | TokenKind::Ramp
            | TokenKind::Background
            | TokenKind::Foreground
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
    )
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
