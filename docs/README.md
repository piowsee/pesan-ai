# pesan-ai Documentation

This project uses [mdBook](https://rust-lang.github.io/mdBook/) to build documentation and [mdbook-i18n-helpers](https://github.com/google/mdbook-i18n-helpers) for translations.

## Prerequisites

1. **Install Rust & Cargo**

   Download from: https://rust-lang.org/tools/install

   The installer includes **Cargo** (the Rust package manager), so one install is enough.

2. **Install mdBook**

   ```bash
   cargo install mdbook
   ```

3. **Install mdbook-i18n-helpers**

   ```bash
   cargo install mdbook-i18n-helpers
   ```

All tools are ready.

---

## Running the Docs

| Command | Description |
|---|---|
| `mdbook build` | Build docs to the `book/` directory |
| `mdbook watch --open` | Auto-rebuild on changes and open in browser |
| `mdbook serve` | Start a local dev server with live reload |

---

## Running a Translated Book

> [!NOTE]
> Serving a translated book **only works on Linux**. It is not supported on Windows or macOS.

Replace `xx` with the locale code (e.g. `id` for Indonesian).

```bash
MDBOOK_BOOK__LANGUAGE=xx mdbook serve -d book/xx
```

Example for Indonesian:

```bash
MDBOOK_BOOK__LANGUAGE=id mdbook serve -d book/id
```

Then open `http://localhost:3000` in your browser.

---

## Creating & Updating Translations

### Workflow overview

1. Update the source `.md` files (original English text)
2. Regenerate `po/messages.pot` as the template
3. Update each locale's `.po` file with `msgmerge`
4. Edit translations in the `.po` file using **Poedit**
5. Rebuild to verify

### Important rules

- **Do not edit** `po/messages.pot` manually. It is auto-generated.
- **Do not edit** `.po` files with a plain text editor or IDE. You **MUST** use **[Poedit](https://poedit.com/)**.

### 1. Generate `po/messages.pot` (PO Template)

After modifying the source `.md` files, regenerate the template:

```bash
MDBOOK_OUTPUT='{"xgettext": {}}' mdbook build -d po
```

The template file will be created at `po/messages.pot`.

To split the `.pot` file per section/chapter (cleaner for large books), use the `depth` parameter:

```bash
MDBOOK_OUTPUT='{"xgettext": {"depth": "1"}}' mdbook build -d po/messages
```

### 2. Start a New Translation

Once `po/messages.pot` is ready, create a `.po` file for the new locale:

```bash
msginit -i po/messages.pot -l xx -o po/xx.po
```

### 3. Update an Existing Translation

When the source text changes, update the `.po` file with:

```bash
msgmerge --update po/xx.po po/messages.pot
```

What happens:

- **Unchanged messages** → kept as-is
- **Deleted messages** → marked with `#~` (old)
- **Updated messages** → marked with `#, fuzzy`

**Fuzzy** entries carry over the previous translation for reference. Review and update them manually, then remove the `#, fuzzy` marker when done.

### 4. Edit Translations

Open the `po/xx.po` file with **[Poedit](https://poedit.com/)** (required), then translate each `msgstr`.

**Do not** use any other editor. Poedit correctly handles the `.po` file format and structure.

After saving, Poedit automatically generates the `po/xx.mo` file.

### 5. Verify

Rebuild the docs to check that translations appear correctly:

```bash
mdbook build
```

> [!NOTE]
> On Windows, you cannot serve a translated book, but you **can** build it and open the static files from `book/`.

---