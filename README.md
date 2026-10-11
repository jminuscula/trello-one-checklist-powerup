# Trello Checklist Overview

A small, free Trello Power-Up that consolidates checklist items from all cards on a board into one searchable, filterable view.

## Features

- Search cards, lists, checklists, and items
- Filter all/open/completed items (defaults to open items)
- Filter by Trello list (defaults to all lists)
- Filter items assigned to the current member
- Toggle checklist items directly from the overview
- Open the underlying Trello card
- Theme-aware board button icon and reusable app listing icon
- Static deployment; no application backend or database

## Deployment

Set the Vercel environment variable:

`TRELLO_POWER_UP_KEY`

The Vercel build generates `config.js` from this variable. `config.js` is gitignored.

The Power-Up API key is not a user credential, but it is kept out of source control so deployment configuration remains environment-specific. User authorization tokens are obtained through Trello's Power-Up REST client and are never stored in this repository.

## Trello setup

1. Create a Trello Power-Up.
2. Enable the `board-buttons` capability.
3. Set the connector URL to the deployed `/connector.html`.
4. Configure the Vercel `TRELLO_POWER_UP_KEY` variable with the Power-Up API key.
5. Enable the Power-Up on a board.
6. In Power-Up Admin → Basic Information, use the deployed `/icon.svg` URL as the Power-Up icon. The board button automatically uses `/icon-light.svg` and `/icon-dark.svg` for contrast on different board backgrounds.

## Local development

Run:

```bash
TRELLO_POWER_UP_KEY=your_key npm run build
```

Then serve the directory with any static HTTP server.

## License

MIT
