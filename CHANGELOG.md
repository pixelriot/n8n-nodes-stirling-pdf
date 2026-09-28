# Changelog

## Unreleased

### Added

- **General** resource with **Merge** (several PDFs from one item into one, in the order of _Input Data Field Names_) and **Split Pages** (cut a PDF after the given pages).

### Fixed

- Binary results with a generic `application/octet-stream` content type now get their type and extension from the response's `Content-Disposition` file name, or else from the file's first bytes (ZIP, PDF, PNG, JPEG, GIF, WebP). ZIP results (e.g. PDF to Image with one image per page) previously came out as `.octet-stream` files that the Compression node could not unpack.
