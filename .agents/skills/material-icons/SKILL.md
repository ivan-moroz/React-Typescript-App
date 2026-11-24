---
name: material-icons
description: Use this project's Material Icons font whenever adding or replacing UI icons.
---

# Material Icons

For every new or replaced UI icon in this project, use the existing Material Icons font loaded in `app/layout.tsx`.

Render an icon with its Material Icons ligature, for example:

```tsx
<span className="material-icons" aria-hidden="true">backspace</span>
```

Keep icon-only controls accessible by giving the button an `aria-label` and a useful `title` when appropriate. Style the icon through the feature's stylesheet. Do not use Unicode symbols or emoji as UI icons, and do not add another icon package or font when the existing Material Icons font provides the icon.
