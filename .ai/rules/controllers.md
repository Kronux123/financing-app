---
paths:
  - 'resources/js/pages/activities/**, resources/js/lib/activities.ts, app/Http/Controllers/ActivityController.php'
---

# Controllers

## The activity log pages in the database, and its page size rides in a cookie
The page is a url (`?page=3`), so it is linkable and the back button undoes it. The page size is a preference rather than a place, so it travels as the unencrypted `activities_rows` cookie — registered in bootstrap/app.php beside `appearance` and `sidebar_state`, and written by `saveRowsPerPage()` in lib/activities.ts.

The cookie is the load-bearing part. Local storage never reaches the server, so a size kept there could only ever arrive one render too late, forcing the server to slice a guess and the client to correct it with a second request. A cookie is sent with the request, so the first render is already right — and it works under SSR, which local storage cannot.

Validate it on the way in. `ActivityController::ROWS_PER_PAGE` is the allowed set and anything else falls back to ten; an unchecked cookie is a way for the client to ask the database for the whole table.
