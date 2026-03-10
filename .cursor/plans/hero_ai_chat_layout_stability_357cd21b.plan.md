---
name: Hero AI Chat layout stability
overview: Fix layout shifts and viewport jumps in the portal homepage hero by containing scroll to the chat messages area, giving the search/chat widget a stable height across tabs, and preventing focus-induced page scroll. Optional hero min-height will keep the gradient section stable.
todos: []
isProject: false
---

# Hero Section AI Chat Layout Stability

## Root causes

- **Document scroll from chat**: In [apps/portal/components/chat/AIChat.tsx](apps/portal/components/chat/AIChat.tsx), `scrollToBottom()` uses `messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })`. That scrolls the **page** to bring the sentinel into view, which moves the viewport and can push the chat widget up or out of view when messages update or on first load.
- **Height change on tab switch**: Search mode wraps `SearchBar` in `<div className="p-6">` (variable height). Chat mode uses `<div className="flex flex-col h-96">`. Switching tabs changes the card height and causes reflow and visible jump.
- **Focus-induced scroll**: The chat input has `autoFocus`. When switching to the AI Chat tab, the browser may scroll the focused input into view, triggering a page-level scroll.
- **Hero height not reserved**: The hero in [apps/portal/app/page.tsx](apps/portal/app/page.tsx) has no `min-height`; its height is driven by content. When the widget resizes or content reflows, the section can grow/shrink, contributing to the “white space” and jump.

## Implementation plan

### 1. Contain scroll to the messages panel (AIChat.tsx)

- Add a ref for the **scrollable messages container** (the `div` with `flex-1 overflow-y-auto`), e.g. `messagesContainerRef`.
- In `scrollToBottom`, stop using `scrollIntoView` on `messagesEndRef`. Instead:
  - Use the container ref and set `containerRef.current.scrollTop = containerRef.current.scrollHeight` so only the messages area scrolls.
- Keep the sentinel `<div ref={messagesEndRef} />` for layout; it is no longer used for scrolling. Optionally remove it if not needed for anything else.

This prevents any message update or initial render from moving the document scroll and keeps the chat widget fixed in the hero.

### 2. Stable height for Search and Chat content (AIChat.tsx)

- Define a single content height for both modes (e.g. `h-96` / 24rem, or a shared constant like `min-h-[24rem]`).
- **Search mode**: Wrap the existing `<div className="p-6">` (and its `SearchBar`) in a container that has the same height as the chat content area, e.g. `min-h-[24rem]` or a fixed height so the overall card height does not change when switching tabs.
- **Chat mode**: Keep the current `h-96` (or use the same value as the search wrapper) so the total card height is identical in both modes.

Result: switching between Search and AI Chat no longer resizes the card or causes a vertical shift.

### 3. Prevent focus from scrolling the page (AIChat.tsx)

- Remove the `autoFocus` attribute from the chat input.
- When entering chat mode, focus the input programmatically with scroll prevention:
  - Use a ref for the input, e.g. `inputRef`.
  - In a `useEffect` that runs when `mode === 'chat'`, call `inputRef.current?.focus({ preventScroll: true })` (e.g. after a brief timeout or `requestAnimationFrame` so the chat UI is mounted).

This keeps keyboard usability without triggering the browser’s “scroll focused element into view” behavior.

### 4. Optional: Hero min-height and spacing (page.tsx)

- On the hero `<section>`, add a `min-height` (e.g. `min-h-[32rem]` or `min-h-[36rem]` on large screens) so the gradient block has a stable height and doesn’t jump when the widget content or tab changes.
- Leave the decorative wave as-is (`absolute -bottom-6`, `z-0`). If any white band still appears between the hero and “Browse Listings by Tier”, inspect the next section for extra top margin/padding and trim if needed.

## Files to change


| File                                                                             | Changes                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [apps/portal/components/chat/AIChat.tsx](apps/portal/components/chat/AIChat.tsx) | Add `messagesContainerRef`; scroll container by setting `scrollTop` in `scrollToBottom`; give search and chat content a shared fixed/min height; add `inputRef`, remove `autoFocus`, focus with `{ preventScroll: true }` when `mode === 'chat'`. |
| [apps/portal/app/page.tsx](apps/portal/app/page.tsx)                             | Optional: add `min-height` to hero `<section>`; optionally reduce any top margin on the “Listings by Tier” section if it contributes to white space.                                                                                              |


## Verification

- Switch between Search and AI Chat: no vertical jump; widget height stays constant.
- Type and send messages: only the messages area scrolls; page scroll position does not change; chat widget stays fully visible in the hero.
- No large white gap between the hero curve and “Browse Listings by Tier” after the above changes.

