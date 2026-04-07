# STEP 3 Mobile Manual Validation

## Run

1. `cd apps/mobile`
2. `pnpm start`
3. Open Expo Go or emulator.

## Validation Path

1. Splash screen appears and auto-transitions to Auth.
2. On Auth screen:
   - tap `Continue as Guest` or `Mock Sign In`
   - confirm transition to Brand Picker.
3. On Brand Picker:
   - loading card appears briefly
   - select at least one brand
   - tap `Continue to Calendar`.
4. On Calendar:
   - month grid shows badge counts on days with events
   - tap a day to see daily events in the bottom sheet
   - switch sort mode `Discount` / `Ending Soon`
   - tap an event card to open Sale Detail.
5. On Sale Detail:
   - confirm title, status badge, date range, discount text
   - tap `Back to Calendar`.
6. Open `Inbox` tab:
   - loading state appears briefly
   - list shows seed notifications
   - tap notification to navigate to Sale Detail.
7. Open `Prefs` tab:
   - toggle notification switches
   - confirm values change immediately (local state only).
8. Open `Brands` tab from top navigation:
   - verify selected brands are preserved.

## Expected Constraints (STEP 3)

- No real auth integration (mock only)
- No real push token registration/delivery
- Data source is seed-only local state
