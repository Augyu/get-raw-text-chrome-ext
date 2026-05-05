# Tab Content & Link Collector

A lightweight Chrome extension that collects tabs from the current Chrome window and copies either tab URLs or cleaned page content.

## Features

- Collect all tab URLs from the current window
- Extract readable page content from open tabs
- Remove HTML tags and layout noise
- Copy all output with one click
- Supports Greenhouse job pages through the Greenhouse jobs API

## Usage

1. Open the tabs you want to collect.
2. Click the extension icon.
3. Choose either **URLs only** or **Page content**.
4. Click **Load Tabs**.
5. Click **Copy All**.

## Greenhouse Job Page Support

Some job pages load the job description inside an iframe, which normal page scraping cannot read.

For Greenhouse job pages, this extension detects the iframe and fetches the job content from:

```text
https://boards-api.greenhouse.io/v1/boards/{company}/jobs/{token}
```
The returned HTML content is converted into clean plain text.

## Notes

Some pages may block content extraction because of browser security restrictions.
