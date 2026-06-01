# uebersicht-widgets

Personal [Übersicht](http://tracesof.net/uebersicht/) widgets for macOS.

## Widgets

### linear-weekly-tasks

Shows sub-issues from a parent Linear issue on your desktop. Click the header or any task to open the parent issue in Linear.

## Setup

1. Install [Übersicht](http://tracesof.net/uebersicht/).
2. Copy a widget into your Übersicht widgets folder:

   ```bash
   cp widgets/linear-weekly-tasks.jsx ~/Library/Application\ Support/Übersicht/widgets/
   ```

3. Create a Linear personal API key at [linear.app/settings/api](https://linear.app/settings/api).
4. Save the key:

   ```bash
   printf '%s' 'lin_api_...' > ~/Library/Application\ Support/Übersicht/.linear-api-key
   chmod 600 ~/Library/Application\ Support/Übersicht/.linear-api-key
   ```

5. Edit `ISSUE_ID` at the top of the widget file to point at your weekly parent issue.
6. Refresh widgets from the Übersicht menu bar.

## Interaction

To click the widget, enable interaction in Übersicht preferences, grant Accessibility access, and use your configured interaction shortcut.

## Configuration

| Setting | Location | Default |
|---------|----------|---------|
| Parent issue | `ISSUE_ID` in widget file | `SF-118` |
| Refresh interval | `refreshFrequency` | 30 seconds |
| Widget scale | `SCALE` | `2.025` |

Project tags show short codes (e.g. `CA`, `CTG`) instead of full customer names — edit `PROJECT_TO_SHORT` in the widget file to add or change codes.
| API key file | `~/Library/Application Support/Übersicht/.linear-api-key` | — |
