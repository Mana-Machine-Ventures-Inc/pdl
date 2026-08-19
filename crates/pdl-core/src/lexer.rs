//! PDL lexer (`shared/keywords.json` + `grammar/pdl.ebnf`). Faithful port of `src/lexer.ts`.

use crate::error::PdlError;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TokenKind {
    Import,
    PreviewBackground,
    Primitive,
    Semantic,
    Theme,
    TypeStyle,
    Variant,
    Protocol,
    /// `requires PointerInput` inside a protocol body.
    Requires,
    /// Bare `host` marker inside a protocol body, or top-level `host Name(…)`.
    Host,
    /// Top-level `catalog Name { … }` (host-role token remap).
    Catalog,
    /// Optional body on a host profile (`host Default(…) mount { … }`).
    Mount,
    /// Soft/strict convert in `mount` (`as?` / `as`).
    As,
    /// `use catalog Name` inside `mount`.
    Use,
    Component,
    Interaction,
    Expose,
    Fixtures,
    Samples,
    Usage,
    Rules,
    Extend,
    Emits,
    Emit,
    Let,
    If,
    Else,
    On,
    For,
    /// `ForEach(list) { item in … }` binder introducer.
    In,
    True,
    False,
    Null,
    SelfKw,
    Case,
    Example,
    Rule,
    Description,
    Animate,
    Where,
    Tags,
    EdgeInsets,
    Corner,
    CornerRadii,
    GradientStop,
    BlurStyle,
    Color,
    Opacity,
    Distance,
    Radius,
    Shadow,
    Icon,
    MediaSource,
    Ratio,
    FontFamily,
    Size,
    Weight,
    LineHeight,
    LetterSpacing,
    Sizing,
    Duration,
    Ease,
    Timing,
    Pose,
    Stagger,
    Motion,
    Effect,
    Ramp,
    Blur,
    Media,
    Vibrancy,
    Background,
    Foreground,
    Ident,
    DotEnum,
    StringLit,
    Number,
    HexColor,
    LBrace,
    RBrace,
    LParen,
    RParen,
    LBracket,
    RBracket,
    Eq,
    EqEq,
    Ne,
    /// Unary Bool negation (`!isOn` / `isOn = !isOn`).
    Bang,
    Colon,
    Comma,
    PlusEq,
    AndAnd,
    OrOr,
    At,
    Gt,
    Ge,
    Lt,
    Le,
    /// `?` after `as` (`as?`).
    Question,
    /// Coalesce in `mount` (`??`).
    QuestionQuestion,
    Dot,
    Eof,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Token {
    pub kind: TokenKind,
    pub value: String,
    pub line: u32,
    pub column: u32,
}

fn keyword(raw: &str) -> Option<TokenKind> {
    Some(match raw {
        "import" => TokenKind::Import,
        "previewBackground" => TokenKind::PreviewBackground,
        "primitive" => TokenKind::Primitive,
        "semantic" => TokenKind::Semantic,
        "theme" => TokenKind::Theme,
        "typeStyle" => TokenKind::TypeStyle,
        // `enum` is a surface alias for `variant` (same AST / IR); may diverge later.
        "variant" | "enum" => TokenKind::Variant,
        "protocol" => TokenKind::Protocol,
        "requires" => TokenKind::Requires,
        "host" => TokenKind::Host,
        "catalog" => TokenKind::Catalog,
        "mount" => TokenKind::Mount,
        "as" => TokenKind::As,
        "use" => TokenKind::Use,
        "component" => TokenKind::Component,
        "interaction" => TokenKind::Interaction,
        "expose" => TokenKind::Expose,
        "fixtures" => TokenKind::Fixtures,
        "samples" => TokenKind::Samples,
        "usage" => TokenKind::Usage,
        "rules" => TokenKind::Rules,
        "extend" => TokenKind::Extend,
        "emits" => TokenKind::Emits,
        "emit" => TokenKind::Emit,
        "let" => TokenKind::Let,
        "if" => TokenKind::If,
        "else" => TokenKind::Else,
        "on" => TokenKind::On,
        "for" => TokenKind::For,
        "in" => TokenKind::In,
        "true" => TokenKind::True,
        "false" => TokenKind::False,
        "null" => TokenKind::Null,
        "self" => TokenKind::SelfKw,
        "case" => TokenKind::Case,
        "example" => TokenKind::Example,
        "Rule" => TokenKind::Rule,
        "description" => TokenKind::Description,
        "animate" => TokenKind::Animate,
        "where" => TokenKind::Where,
        "tags" => TokenKind::Tags,
        "EdgeInsets" => TokenKind::EdgeInsets,
        "Corner" => TokenKind::Corner,
        "CornerRadii" => TokenKind::CornerRadii,
        "GradientStop" => TokenKind::GradientStop,
        "BlurStyle" => TokenKind::BlurStyle,
        "Color" => TokenKind::Color,
        "Opacity" => TokenKind::Opacity,
        "Distance" => TokenKind::Distance,
        "Radius" => TokenKind::Radius,
        "Shadow" => TokenKind::Shadow,
        "Icon" => TokenKind::Icon,
        "MediaSource" => TokenKind::MediaSource,
        "Ratio" => TokenKind::Ratio,
        "FontFamily" => TokenKind::FontFamily,
        "Size" => TokenKind::Size,
        "Weight" => TokenKind::Weight,
        "LineHeight" => TokenKind::LineHeight,
        "LetterSpacing" => TokenKind::LetterSpacing,
        "Sizing" => TokenKind::Sizing,
        "Duration" => TokenKind::Duration,
        "Ease" => TokenKind::Ease,
        "Timing" => TokenKind::Timing,
        "PresentationMotion" => TokenKind::Ident,
        "Pose" => TokenKind::Pose,
        "Stagger" => TokenKind::Stagger,
        "Motion" => TokenKind::Motion,
        "Effect" => TokenKind::Effect,
        "Ramp" => TokenKind::Ramp,
        "Blur" => TokenKind::Blur,
        "Media" => TokenKind::Media,
        "Vibrancy" => TokenKind::Vibrancy,
        "Background" => TokenKind::Background,
        "Foreground" => TokenKind::Foreground,
        _ => return None,
    })
}

fn is_ident_start(c: char) -> bool {
    c.is_ascii_alphabetic() || c == '_'
}

fn is_ident_continue(c: char) -> bool {
    c.is_ascii_alphanumeric() || c == '_'
}

fn is_hex(c: char) -> bool {
    c.is_ascii_hexdigit()
}

/// Lex `source` into tokens. `file_path` is used only in error messages.
pub fn tokenize(source: &str, file_path: &str) -> Result<Vec<Token>, PdlError> {
    let chars: Vec<char> = source.chars().collect();
    let mut i = 0usize;
    let mut line: u32 = 1;
    let mut column: u32 = 1;
    let mut tokens: Vec<Token> = Vec::new();

    let bump = |n: usize, i: &mut usize, line: &mut u32, column: &mut u32, chars: &[char]| {
        for k in 0..n {
            let ch = chars.get(*i + k).copied().unwrap_or('\0');
            if ch == '\n' {
                *line += 1;
                *column = 1;
            } else if ch == '\r' {
                if chars.get(*i + k + 1).copied() != Some('\n') {
                    *line += 1;
                    *column = 1;
                }
            } else {
                *column += 1;
            }
        }
        *i += n;
    };

    if chars.first().copied() == Some('\u{feff}') {
        bump(1, &mut i, &mut line, &mut column, &chars);
    }

    let push = |tokens: &mut Vec<Token>,
                kind: TokenKind,
                value: String,
                start_line: u32,
                start_col: u32| {
        tokens.push(Token {
            kind,
            value,
            line: start_line,
            column: start_col,
        });
    };

    let err = |code: &str, message: String, path: &str, line: u32, column: u32| -> PdlError {
        PdlError::new(
            code,
            message,
            Some(path.to_string()),
            Some(line),
            Some(column),
        )
    };

    while i < chars.len() {
        let start_line = line;
        let start_col = column;
        let c = chars[i];

        if c == ' ' || c == '\t' || c == '\n' || c == '\r' {
            bump(1, &mut i, &mut line, &mut column, &chars);
            continue;
        }

        if c == '/' && chars.get(i + 1).copied() == Some('/') {
            bump(2, &mut i, &mut line, &mut column, &chars);
            while i < chars.len() && chars[i] != '\n' && chars[i] != '\r' {
                bump(1, &mut i, &mut line, &mut column, &chars);
            }
            continue;
        }

        if c == '/' && chars.get(i + 1).copied() == Some('*') {
            bump(2, &mut i, &mut line, &mut column, &chars);
            let mut closed = false;
            while i < chars.len() {
                if chars[i] == '*' && chars.get(i + 1).copied() == Some('/') {
                    bump(2, &mut i, &mut line, &mut column, &chars);
                    closed = true;
                    break;
                }
                bump(1, &mut i, &mut line, &mut column, &chars);
            }
            if !closed {
                return Err(err(
                    "PDL-E001",
                    "Unterminated block comment (expected `*/`)".to_string(),
                    file_path,
                    start_line,
                    start_col,
                ));
            }
            continue;
        }

        if c == '#' {
            let mut j = i + 1;
            while j < chars.len() && is_hex(chars[j]) {
                j += 1;
            }
            let len = j - (i + 1);
            if len != 3 && len != 6 && len != 8 {
                return Err(err(
                    "PDL-E001",
                    format!("Invalid hex color length ({len}), expected 3, 6, or 8"),
                    file_path,
                    start_line,
                    start_col,
                ));
            }
            let raw: String = chars[i..j].iter().collect();
            push(&mut tokens, TokenKind::HexColor, raw, start_line, start_col);
            bump(j - i, &mut i, &mut line, &mut column, &chars);
            continue;
        }

        if c == '"' {
            let mut j = i + 1;
            let mut out = String::new();
            while j < chars.len() {
                let ch = chars[j];
                if ch == '"' {
                    break;
                }
                if ch == '\\' {
                    let esc = chars.get(j + 1).copied();
                    let Some(esc) = esc else { break };
                    match esc {
                        'n' => {
                            out.push('\n');
                            j += 2;
                            continue;
                        }
                        'r' => {
                            out.push('\r');
                            j += 2;
                            continue;
                        }
                        't' => {
                            out.push('\t');
                            j += 2;
                            continue;
                        }
                        '\\' | '"' => {
                            out.push(esc);
                            j += 2;
                            continue;
                        }
                        'u' => {
                            if j + 5 >= chars.len() {
                                return Err(err(
                                    "PDL-E001",
                                    "Invalid \\u escape in string".into(),
                                    file_path,
                                    line,
                                    column + (j - i) as u32,
                                ));
                            }
                            let hex: String = chars[j + 2..j + 6].iter().collect();
                            if hex.len() != 4 || !hex.chars().all(is_hex) {
                                return Err(err(
                                    "PDL-E001",
                                    "Invalid \\u escape in string".into(),
                                    file_path,
                                    line,
                                    column + (j - i) as u32,
                                ));
                            }
                            let code = u32::from_str_radix(&hex, 16).unwrap();
                            out.push(char::from_u32(code).unwrap_or('\u{FFFD}'));
                            j += 6;
                            continue;
                        }
                        other => {
                            return Err(err(
                                "PDL-E001",
                                format!("Invalid escape \\{other} in string"),
                                file_path,
                                line,
                                column + (j - i) as u32,
                            ));
                        }
                    }
                }
                if ch == '\n' || ch == '\r' {
                    return Err(err(
                        "PDL-E001",
                        "Unterminated string literal".into(),
                        file_path,
                        start_line,
                        start_col,
                    ));
                }
                out.push(ch);
                j += 1;
            }
            if j >= chars.len() || chars[j] != '"' {
                return Err(err(
                    "PDL-E001",
                    "Unterminated string literal".into(),
                    file_path,
                    start_line,
                    start_col,
                ));
            }
            push(
                &mut tokens,
                TokenKind::StringLit,
                out,
                start_line,
                start_col,
            );
            bump(j - i + 1, &mut i, &mut line, &mut column, &chars);
            continue;
        }

        if c == '.' {
            let prev = if i == 0 { ' ' } else { chars[i - 1] };
            let after_ident_or_number = prev.is_ascii_alphanumeric() || prev == '_';
            let next = chars.get(i + 1).copied().unwrap_or('\0');
            if !after_ident_or_number
                && next != '\0'
                && !next.is_ascii_digit()
                && is_ident_start(next)
            {
                let mut j = i + 1;
                while j < chars.len() && is_ident_continue(chars[j]) {
                    j += 1;
                }
                let raw: String = chars[i..j].iter().collect();
                push(&mut tokens, TokenKind::DotEnum, raw, start_line, start_col);
                bump(j - i, &mut i, &mut line, &mut column, &chars);
                continue;
            }
            push(
                &mut tokens,
                TokenKind::Dot,
                ".".into(),
                start_line,
                start_col,
            );
            bump(1, &mut i, &mut line, &mut column, &chars);
            continue;
        }

        if c == '-' || c.is_ascii_digit() {
            let neg = c == '-';
            let mut j = i + if neg { 1 } else { 0 };
            if neg && (j >= chars.len() || !chars[j].is_ascii_digit()) {
                return Err(err(
                    "PDL-E001",
                    "Invalid number: lone minus".into(),
                    file_path,
                    start_line,
                    start_col,
                ));
            }
            let digit_start = j;
            while j < chars.len() && chars[j].is_ascii_digit() {
                j += 1;
            }
            if j > digit_start
                && chars[digit_start] == '0'
                && j > digit_start + 1
                && chars.get(digit_start + 1).copied() != Some('.')
            {
                return Err(err(
                    "PDL-E001",
                    "Leading zeros not permitted in number literals".into(),
                    file_path,
                    start_line,
                    start_col,
                ));
            }
            let mut is_decimal = false;
            if chars.get(j).copied() == Some('.') {
                is_decimal = true;
                j += 1;
                let frac_start = j;
                while j < chars.len() && chars[j].is_ascii_digit() {
                    j += 1;
                }
                if j == frac_start {
                    return Err(err(
                        "PDL-E001",
                        "Malformed decimal literal".into(),
                        file_path,
                        start_line,
                        start_col,
                    ));
                }
            }
            let raw: String = chars[i..j].iter().collect();
            if !neg && !is_decimal && raw.len() > 1 && raw.starts_with('0') {
                return Err(err(
                    "PDL-E001",
                    "Leading zeros not permitted in number literals".into(),
                    file_path,
                    start_line,
                    start_col,
                ));
            }
            push(&mut tokens, TokenKind::Number, raw, start_line, start_col);
            bump(j - i, &mut i, &mut line, &mut column, &chars);
            continue;
        }

        if is_ident_start(c) {
            let mut j = i;
            while j < chars.len() && is_ident_continue(chars[j]) {
                j += 1;
            }
            let raw: String = chars[i..j].iter().collect();
            let kind = keyword(&raw).unwrap_or(TokenKind::Ident);
            push(&mut tokens, kind, raw, start_line, start_col);
            bump(j - i, &mut i, &mut line, &mut column, &chars);
            continue;
        }

        let two = if i + 1 < chars.len() {
            format!("{}{}", chars[i], chars[i + 1])
        } else {
            String::new()
        };

        match two.as_str() {
            "==" => {
                push(
                    &mut tokens,
                    TokenKind::EqEq,
                    "==".into(),
                    start_line,
                    start_col,
                );
                bump(2, &mut i, &mut line, &mut column, &chars);
                continue;
            }
            "!=" => {
                push(
                    &mut tokens,
                    TokenKind::Ne,
                    "!=".into(),
                    start_line,
                    start_col,
                );
                bump(2, &mut i, &mut line, &mut column, &chars);
                continue;
            }
            _ if c == '!' => {
                push(
                    &mut tokens,
                    TokenKind::Bang,
                    "!".into(),
                    start_line,
                    start_col,
                );
                bump(1, &mut i, &mut line, &mut column, &chars);
                continue;
            }
            "+=" => {
                push(
                    &mut tokens,
                    TokenKind::PlusEq,
                    "+=".into(),
                    start_line,
                    start_col,
                );
                bump(2, &mut i, &mut line, &mut column, &chars);
                continue;
            }
            "&&" => {
                push(
                    &mut tokens,
                    TokenKind::AndAnd,
                    "&&".into(),
                    start_line,
                    start_col,
                );
                bump(2, &mut i, &mut line, &mut column, &chars);
                continue;
            }
            "||" => {
                push(
                    &mut tokens,
                    TokenKind::OrOr,
                    "||".into(),
                    start_line,
                    start_col,
                );
                bump(2, &mut i, &mut line, &mut column, &chars);
                continue;
            }
            ">=" => {
                push(
                    &mut tokens,
                    TokenKind::Ge,
                    ">=".into(),
                    start_line,
                    start_col,
                );
                bump(2, &mut i, &mut line, &mut column, &chars);
                continue;
            }
            "<=" => {
                push(
                    &mut tokens,
                    TokenKind::Le,
                    "<=".into(),
                    start_line,
                    start_col,
                );
                bump(2, &mut i, &mut line, &mut column, &chars);
                continue;
            }
            "??" => {
                push(
                    &mut tokens,
                    TokenKind::QuestionQuestion,
                    "??".into(),
                    start_line,
                    start_col,
                );
                bump(2, &mut i, &mut line, &mut column, &chars);
                continue;
            }
            _ => {}
        }

        let (kind, val) = match c {
            '{' => (TokenKind::LBrace, "{"),
            '}' => (TokenKind::RBrace, "}"),
            '(' => (TokenKind::LParen, "("),
            ')' => (TokenKind::RParen, ")"),
            '[' => (TokenKind::LBracket, "["),
            ']' => (TokenKind::RBracket, "]"),
            '=' => (TokenKind::Eq, "="),
            ':' => (TokenKind::Colon, ":"),
            ',' => (TokenKind::Comma, ","),
            '@' => (TokenKind::At, "@"),
            '>' => (TokenKind::Gt, ">"),
            '<' => (TokenKind::Lt, "<"),
            '?' => (TokenKind::Question, "?"),
            _ => {
                return Err(err(
                    "PDL-E001",
                    format!("Unexpected character {:?}", c),
                    file_path,
                    start_line,
                    start_col,
                ));
            }
        };
        push(&mut tokens, kind, val.into(), start_line, start_col);
        bump(1, &mut i, &mut line, &mut column, &chars);
    }

    push(&mut tokens, TokenKind::Eof, String::new(), line, column);
    Ok(tokens)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn skips_block_comments() {
        let toks = tokenize(
            r#"
/*
  ForEach(chips) { chip in
    chip.title = "A"
  }
  */
primitive color.black: Color = #000000
"#,
            "t.pdl",
        )
        .unwrap();
        assert_eq!(toks[0].kind, TokenKind::Primitive);
        assert!(!toks
            .iter()
            .any(|t| t.value == "ForEach" || t.value == "chip"));
    }

    #[test]
    fn rejects_unterminated_block_comment() {
        let err = tokenize("/* still open\nprimitive x: Color = #000", "t.pdl").unwrap_err();
        assert_eq!(err.code, "PDL-E001");
        assert!(err.message.contains("Unterminated block comment"));
    }

    #[test]
    fn tokenizes_primitive_line() {
        let toks = tokenize(r#"primitive color.black: Color = #000000"#, "t.pdl").unwrap();
        assert_eq!(toks[0].kind, TokenKind::Primitive);
        assert_eq!(toks[1].kind, TokenKind::Ident);
        assert_eq!(toks[1].value, "color");
        assert_eq!(toks[2].kind, TokenKind::Dot);
        assert!(toks.iter().any(|t| t.kind == TokenKind::HexColor));
    }

    #[test]
    fn rejects_leading_zeros() {
        let err = tokenize("x = 01", "t.pdl").unwrap_err();
        assert!(err.message.contains("Leading zeros"));
    }

    #[test]
    fn dot_enum_vs_member() {
        let toks = tokenize("tone = .primary\nFoo.children = []", "t.pdl").unwrap();
        assert!(toks
            .iter()
            .any(|t| t.kind == TokenKind::DotEnum && t.value == ".primary"));
        // Foo . children — Dot between idents
        let kinds: Vec<_> = toks.iter().map(|t| t.kind).collect();
        assert!(kinds.contains(&TokenKind::Dot));
    }
}
