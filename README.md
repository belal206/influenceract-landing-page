# InfluencerAct Landing Page

Responsive brand website with a coral and dark-purple theme, local images and fonts, and interactive creator, service, award and FAQ sections.

## Run locally

```sh
python3 -m http.server 4173 --directory dist
```

Open http://localhost:4173.

## Deploy to Netlify

Import this repository in Netlify. No build command is needed; the publish directory is `dist` and is configured in `netlify.toml`. You can also upload the contents of `dist` directly.

## Enquiry form

- Single-page form with name, business email and phone.
- Budget slider and manual rupee field, starting at a minimum of ₹10,000.
- Multiple social platforms, with an All platforms option.
- Validation prepares an email draft to `contactus@influenceract.com` for the visitor to send. Automatic lead capture requires a form or CRM endpoint.

All runtime assets are bundled in `dist`; no dependencies or build step are required. Font licenses are included with the font files.
