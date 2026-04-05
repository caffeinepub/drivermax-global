# DriverMax Global

## Current State

Version 11 is live. The app has the following pages: Dashboard, EarningsPage, EarningsIntelligencePage, SalesPage, QRMenuPage, SchedulePage, EventsPage, FuelCalculatorPage, ExpenseTrackerPage, ICPStakingPage, SettingsPage. Backend has deleteTrip, deleteShift, deleteStakingRecord, deleteExpense, deleteCustomEvent — but is missing deleteProduct and deleteSale. Frontend has numerous bugs found in a full audit.

## Requested Changes (Diff)

### Add
- `deleteProduct` backend function
- `deleteSale` backend function  
- Start date input to ICPStakingPage log form
- Copy-link button in QRMenuPage
- Edit product flow in SalesPage (reuse existing productId instead of generating new UUID)
- Delete product/sale buttons in SalesPage
- Delete confirmation dialogs everywhere missing them (EventsPage, ExpenseTrackerPage)
- Staking tab to desktop NavBar
- Goal amount pre-populated in EarningsIntelligencePage edit dialog

### Modify
- **SettingsPage.handleSave**: call `actor.saveCallerUserProfile` to actually persist to backend
- **EarningsIntelligencePage**: fix goal progress to use period-appropriate earnings (daily = today only, weekly = this week only, monthly = this month only)
- **EarningsIntelligencePage**: pre-populate goal amount when editing
- **EarningsIntelligencePage**: fix nextPeak logic bug, fix PEAK_WINDOWS night-out end value
- **EarningsIntelligencePage**: apply canAccess('aiInsights', tier) gate at tier 3
- **NavBar**: gate intelligence tab at minTier 3, add staking to desktop tabs
- **currency.ts**: fix locale to match currency code (not always en-ZA)
- **currency.ts**: unify symbols map to avoid duplication
- **DisclaimerBanner**: persist collapsed state to localStorage; fix bottom position from bottom-20 to bottom-28
- **AddTripDialog**: fix date parsing to use local time (append T00:00:00), add date validation
- **VoiceButton**: cancel existing audio/speech before new one; use navigator.language
- **EarningsPage**: replace window.confirm with Dialog component; make summary stats react to platform filter
- **ExpenseTrackerPage**: add delete confirmation dialog; add date picker to add dialog; fix gross earnings to be period-aware
- **EventsPage**: change Custom filter to My Events (isUserCreated); add delete confirmation; add edit dialog
- **SalesPage**: fix product edit to reuse productId; add delete product/sale buttons; add stock decrement on sale
- **QRMenuPage**: filter out-of-stock products from menu display; add copy-link button
- **BottomNav**: close More sheet after navigation; locked items show upgrade prompt instead of silently loading
- **ICPStakingPage**: add start date picker; clear localStorage reminder keys on stake delete; fix duplicate unlock alert
- **Dashboard**: add delete trip action on recent trips; remove hardcoded R500 daily goal fallback (prompt user to set goal instead)
- **tiers.ts**: ensure canAccess('aiInsights') is set to tier 3

### Remove
- Nothing

## Implementation Plan

1. Update backend main.mo: add `deleteProduct` and `deleteSale` functions
2. Regenerate backend.d.ts bindings
3. Fix currency.ts locale bug and dedup symbols map
4. Fix tiers.ts canAccess consistency
5. Fix DisclaimerBanner localStorage persistence + positioning
6. Fix AddTripDialog date timezone bug
7. Fix SettingsPage handleSave backend call
8. Fix EarningsPage: Dialog confirmation + period-aware stats
9. Fix ExpenseTrackerPage: confirmation dialog + date picker + period-aware gross
10. Fix EventsPage: edit dialog + My Events filter + confirmation
11. Fix SalesPage: edit product flow + delete product + delete sale + stock decrement
12. Fix QRMenuPage: filter out-of-stock + copy link
13. Fix EarningsIntelligencePage: period-aware goal + pre-populate edit + nextPeak fix + tier gate
14. Fix NavBar: intelligence minTier=3, add staking to desktop tabs
15. Fix BottomNav: close sheet on nav + upgrade prompt on locked items
16. Fix ICPStakingPage: start date picker + clear localStorage on delete + dedup banners
17. Fix Dashboard: delete trip on recent trips + remove hardcoded goal fallback
18. Fix VoiceButton: cancel audio, use navigator.language
