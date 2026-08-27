# Monochrome product visual — Review Portal

Date: 2026-08-25  
Status: approved for implementation

## Outcome

An internal demo should look like a real review product, not a wireframe. Same flows, same data, same Filestage-inspired viewer layout. Black / white / gray only. No accent color.

## Constraints

- No new features: no command center, uploads, version compare, Salesforce, or real email.
- No motion beyond hover/focus.
- No illustrations, gradients, or UI kits.
- Geist stays. Desktop-first.

## System

| Token | Value | Use |
|---|---|---|
| Ink | `#111111` | Headings, primary actions, selected gallery row |
| Muted | `#6b6b6b` | Secondary copy, meta |
| Quiet | `#8a8a8a` | Timestamps |
| Rule | `#e8e8e8` | Default borders, row dividers |
| Fill | `#f6f6f6` | Hover, canvas well, decision strip |
| White | `#ffffff` | Surfaces |

- Panels: 1px `rule`, no heavy black frames.
- Buttons: ghost = rule border; primary = ink fill. Hover inverts ghost; primary darkens to `#2a2a2a`.
- Tags/badges: no border except Approved (ink fill). Uppercase, 11px, tracking.
- Type: page title 22px / 600; section labels 11px uppercase muted; list title 14px / 500; meta 12px muted.
- Density: list rows ~48px, not padded cards.

## Layout

- List/detail pages (staff home, company, project, blockers, notifications, client home/project): max width ~960px, generous top padding.
- Deliverable viewer: full viewport under the top nav. No max-width wrapper. Files | canvas | comments.

## Surfaces

- **Login:** wordmark as type, not a boxed “RP”. Form without a hard panel, or a single light rule. Demo accounts stay collapsed.
- **Top nav:** 1px rule, not black bar. Notifications as text link with count, not a boxed button.
- **Lists:** one surface, hairline dividers, hover fill. Status on the right. Drop the “→” chevrons.
- **Phase rail:** one horizontal strip of four columns with a thin progress line — not four equal boxed cards.
- **Viewer:** light gallery/sidebar rules; selected file = ink row; numbered pins unchanged; Approve remains the only solid ink button.

## Out of scope

Behavior, routes, schema, copy of demo accounts, prototype Interact/Comment logic.

## Addendum: second-pass polish (2026-08-27)

The first pass established the system above but left several controls reading as functional
rather than finished — the ghost button hover didn't invert as specced, form controls used
default OS chrome, and the viewer toolbar had leftover wireframe language. This addendum locks
the rules for that second pass. Tokens, layout, and scope are unchanged from above; this only
tightens control behavior and chrome.

- **Ghost buttons (`.wf-btn`)**: hover now inverts per the original spec — ink fill, white text,
  ink border. Disabled state is unaffected (0.35 opacity, no invert on hover).
- **Focus**: every interactive control (`button`, `input`, `select`, `textarea`, links styled as
  controls) gets a 1px ink `:focus-visible` outline, 0 offset. No default browser blue ring.
- **Select**: native `<select>` elements are restyled with `appearance: none` and a small CSS
  chevron so they match `.wf-input` height and border instead of showing OS-native chrome. They
  remain real `<select>` elements for keyboard and screen-reader behavior — only the paint changes.
- **Viewer toolbar**: the file gallery toggle reads as a quiet text control ("Files" / "Hide
  files"), not a boxed ghost button. The version switcher is the restyled select above. The
  Interact/Comment segmented control and the decision buttons (Request changes / Reject ghost,
  Approve solid ink) are unchanged in behavior, tightened in padding so the toolbar row is a
  consistent ~40–44px.
- **Comment thread actions** (Pin/Unpin, Resolve/Reopen): styled as muted text links that
  underline only on hover, not permanently underlined.
- **List rows**: keep hairline dividers and hover fill, but rows get horizontal padding so hover
  fill doesn't sit flush against the row's edge.
- **Prototype embed frame** (`/proto/checkout`): borders switch from literal `#111111` to the
  `rule` token so the embedded prototype's chrome matches the rest of the product rather than
  looking like a separate wireframe artifact.

No new tokens, no new colors, no motion beyond hover/focus, no behavior changes.
