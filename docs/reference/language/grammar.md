# Grammar

The formal lexical specification and EBNF live in the normative full spec:

- Lexical: [`full-spec.md` §20](../../full-spec.md#20--lexical-specification)  
- EBNF: [`full-spec.md` §21](../../full-spec.md#21--formal-grammar-ebnf)  

This multi-page tree does **not** duplicate the EBNF (avoids drift). When a production changes, update `full-spec.md` and the Rust/TS parsers together.

## Reserved / notable keywords

Includes (non-exhaustive): `import`, `primitive`, `semantic`, `theme`, `typeStyle`, `variant`, `enum`, `protocol`, `host`, `component`, `emits`, `emit`, `fixtures`, `samples`, `usage`, `rules`, `extend`, `ForEach`, `in`, `if`, `else`, `requires`, `self`, frame kinds `layout` / `text` / `icon` / `media`.

Rejected as decls: `interaction`, classic typed `let` frames, `expose`.

## Implementation note

Compilers may lex `layout` / `text` / `icon` / `media` as ordinary idents and only treat them as kinds in declaration positions — see [`SPEC_GAPS.md`](../../SPEC_GAPS.md).
