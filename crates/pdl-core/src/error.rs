//! PDL diagnostics (`PDL-E00x`).

use std::fmt;

#[derive(Debug, Clone)]
pub struct PdlError {
    pub code: String,
    pub message: String,
    pub path: Option<String>,
    pub line: Option<u32>,
    pub column: Option<u32>,
}

impl PdlError {
    pub fn new(
        code: impl Into<String>,
        message: impl Into<String>,
        path: Option<String>,
        line: Option<u32>,
        column: Option<u32>,
    ) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            path,
            line,
            column,
        }
    }

    pub fn format(&self) -> String {
        let loc = match (&self.path, self.line) {
            (Some(p), Some(l)) => format!("{}:{}:{}: ", p, l, self.column.unwrap_or(0)),
            _ => String::new(),
        };
        format!("{}{}: {}", loc, self.code, self.message)
    }
}

impl fmt::Display for PdlError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.format())
    }
}

impl std::error::Error for PdlError {}
