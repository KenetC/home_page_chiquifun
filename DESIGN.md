---
name: ChiquiFun
description: Tapizado-style seat covers made to measure in a family workshop in Floresta, CABA.
source-of-truth: styles.css (this document describes what the code does; if they disagree, the code wins and this file is updated)
colors:
  bg: "#F5F3F0"
  ink: "#0D0D0D"
  ink-hover: "#2A2725"
  ink-muted: "#55514D"
  header: "#141413"
  black: "#0D0D0D"
  paper: "#F4F1EC"
  paper-80: "#D9D3CB"
  red: "#C1121A"
  red-bright: "#E00000"
  faq-open: "#B0101A"
  yellow: "#F2B705"
  amber: "#E0A000"
  whatsapp: "#25D366"
typography:
  display: "Clash Display 600, uppercase (fallback Arial Narrow, sans-serif)"
  body: "Figtree 400–800 (fallback system-ui, -apple-system, Segoe UI, sans-serif)"
  section-title: "Clash Display 600, clamp(1.625rem, 1.1rem + 1.9vw, 2.75rem), line-height 1, uppercase, one line from 768px"
rounded:
  pill: "999px (every button and chip)"
  circle: "50% (icon buttons, WhatsApp float)"
  card: "1.125rem to 1.5rem (glass cards, hero video card, process photo)"
  focus: "6px"
spacing:
  gutter: "clamp(20px, 4vw, 40px)"
  container: "1440px, centred with --edge"
  header: "4rem; 4.75rem from 1180px"
  touch: "44px minimum"
---

# Design System: ChiquiFun

## Overview

**North star: "Light showroom, dark workshop."** A warm off-white page (`--bg #F5F3F0`) with black ink carries the light sections (hero on desktop, Reseñas, Proyectos, Accesorios, Preguntas frecuentes, Nosotros). Some bands are near-black and carry warm paper text: the header, the brands marquee, Cómo trabajamos, the project gallery and the footer. The workshop's real photos and videos are the only imagery. Nothing is stock or invented.

Behind the light sections, a fixed **ambient background** of three layers of soft white and graphite blobs moves with parallax as the page scrolls (`script.js`, block "Fondo"). Cards on top of it are **light glass**: a translucent white fill, a light top edge, a soft grey shadow and a glint that follows the mouse. Dark sections use a **dark glass** variant.

**Blur rule:** `backdrop-filter` is used only where something sharp sits behind (the header over content, and chips and buttons over the hero video or gallery photos). Glass over the ambient background or over flat dark grounds has no blur (`--glass-blur: none`), because blurring a soft gradient changes nothing visually and costs repaints on scroll.

## Colors

- **Ink `#0D0D0D`**: main text on light sections, and the fill of the primary button on light sections (Cotizar on desktop). Hover goes to `#2A2725`.
- **Ink muted `#55514D`**: leads, paragraphs and secondary labels on light sections.
- **Paper `#F4F1EC` / Paper 80 `#D9D3CB`**: text on dark sections and over video.
- **Header `#141413`**: header background (solid from 960px, transparent over the video on phones until scroll). It is also the `theme-color`.
- **Red**: only the one emphasised headline phrase ("A MEDIDA"). It uses `#E00000` over the phone video and `#C1121A` on the light desktop hero. A few small red accents are allowed: the accessory card icons and the open FAQ question (`#B0101A`). Red is not a button fill.
- **Yellow `#F2B705`** (hover `#E0A000`): the primary button fill on dark grounds (hero on phones, Cómo trabajamos). It is also the interaction and accent signal: current and hover link in the mobile menu, focus ring on dark sections, text selection, location and map pin icons, process step lines, the "Ver trabajo" link on project cards, the first Nosotros milestone dot, contact link underline, and the diamonds in the brands marquee.
- **WhatsApp green `#25D366`** (`--whatsapp`): the floating WhatsApp button and WhatsApp icon chips only.
- **Tokens:** every brand colour lives in `:root` (`--red`, `--red-bright`, `--red-deep`, `--yellow`, `--amber`, `--whatsapp`, `--black`, `--ink*`, `--paper*`). Do not write these hex values outside `:root`.

### Rules
- **One primary per view.** It is ink on light grounds and yellow on dark grounds, always with the WhatsApp icon when it opens WhatsApp.
- **One red phrase per headline**, at most.
- **Green stays on the WhatsApp channel.**

## Typography

- **Clash Display 600, uppercase**: the hero h1, section titles (`.section-title`, `.process__title`) and the mobile menu links. Never another weight.
- **Figtree**: everything else, in sentence case. Weights used: 400 body, 500 nav and labels, 600 buttons and card titles, 800 sparingly for figures.
- The HTML sources of section titles are written in sentence case ("Preguntas frecuentes"), and CSS does the uppercase. Do not type headings in capitals in the HTML.
- Section titles animate word by word on reveal (`script.js` splits them and keeps an `aria-label` with the full text).

## Layout

Mobile first. The gutter is `clamp(20px, 4vw, 40px)` and content is capped at 1440px. The header is fixed, and navigation goes inline from 1180px.

- **Hero, phones (<960px):** full-bleed video with a dark scrim and paper text on top. Buttons are stacked: Cotizar (yellow) and Ver proyectos (dark glass). The facts list is hidden.
- **Hero, desktop (≥960px):** light ground. Copy on the left, and the video in a rounded 4:5 card on the right. Cotizar is ink, Ver proyectos is a white pill with a soft shadow. Under them sits the facts row (4.9 ★ Google, 100% fabricación propia, A medida), 9.375rem below the buttons (1.75rem on short screens). Fact labels are Figtree 500, 0.875rem, sentence case.
- **Brands marquee:** a black band that scrolls endlessly with client logos in one colour and vehicle types, separated by yellow diamonds.
- **Reseñas:** a carousel of light glass cards. Phones get a native swipe row; wider screens show 2–3 cards with arrows.
- **Proyectos destacados:** a curved, cylinder-like row of 10 cards, all fed by one sprite video (`uploads/destacados/`, built by `herramientas/armar-sprite-destacados.sh`). It auto-scrolls and can be dragged. On phones it is a flat row that snaps. Each card opens a `<dialog>` gallery with photos and videos from `uploads/web/<slug>/`.
- **Cómo trabajamos:** a dark section with two tabs ("Fundas en stock", "Diseño personalizado") of 4 steps each. While space allows, the section pins and scroll walks through steps 01→04. Each tab ends in a yellow WhatsApp button ("Consultar stock" / "Diseñar") with a prefilled message.
- **Accesorios:** 4 glass cards. Phones get a swipe row.
- **Preguntas frecuentes:** 3 tabs of `<details>` accordions inside one glass panel.
- **Nosotros:** the story text plus a 4-milestone timeline.
- **Footer:** dark, with contact, hours, a Google Maps embed, legal links and social links.
- **Floating WhatsApp button:** fixed bottom right. It is hidden while the hero or the footer is on screen, because both already show WhatsApp. It pulses twice the first time it appears.

## Shapes and depth

- Every button and chip is a pill. Icon buttons are circles.
- Cards are rounded at 1.125rem to 1.5rem.
- Depth comes from glass: translucent fill, a light edge and soft grey shadows. Shadows are always soft, never hard.
- Buttons lift 2px on hover and press to scale .98.

## Motion and accessibility

- There is one orchestrated hero entrance. Sections reveal on scroll, with staggers capped at 6 steps.
- **Everything that moves on its own has a pause control** (`.motion-toggle`): a 44px dark circle with a pause or play stroke icon, the same look as the location chip. It appears on the hero video (top right of the media, paired with the location chip), on the brands marquee (right edge, solid black with a light hairline because the band is already black) and under the Proyectos row (right). Its label switches between "Pausar…" and "Reproducir/Reanudar…". With reduced motion, the marquee and Proyectos controls are hidden; the hero control stays as "Reproducir video".
- **Navigation shows the current section** while scrolling (`aria-current="location"`): yellow in the mobile menu; paper text plus a 2px yellow underline that grows from the left on desktop.
- On phones, the hero headline's red phrase has a dark halo and the scrim deepens in the lower half, so the red reaches 3:1 over light upholstery.
- `prefers-reduced-motion` turns off: hero and review video autoplay, the project sprite video, the ambient parallax, the reveals and the slide transitions.
- Focus is visible everywhere (ink ring on light sections, yellow or paper ring on dark ones). There is a skip link, targets are at least 44px, tabs follow the ARIA pattern with arrow keys, and Escape closes the menu and the gallery.

## Do / Don't

- **Do** keep real workshop media only, and put a scrim or glass under any text that sits on footage.
- **Do** keep one primary button per view (ink on light, yellow on dark) and send every path to WhatsApp.
- **Don't** fill buttons with red or green. **Don't** recolour or deform the logo.
- **Don't** set Figtree in uppercase or use Clash Display in any weight other than 600.
- **Don't** write placeholder text where visitors can see it. Missing data waits in PRODUCT.md, not on the page.
