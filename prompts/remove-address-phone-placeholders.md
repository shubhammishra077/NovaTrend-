# Remove Address and Phone Example Placeholders

## Goal
Remove example/prefilled-looking placeholder text from the Add/Edit Address and Add/Edit Phone dialogs on the profile page.

## Affected Surface
- `frontend/app/routes/profile.tsx` address and phone dialog input fields.

## Behavior
- Keep all labels, input values, required validation, form state, and save behavior unchanged.
- Remove the placeholder attributes from address label, street, city, ZIP, country, phone label, and phone number fields so the inputs are visually blank until the user enters a value.
- Do not alter placeholders in unrelated forms or other profile page areas.

## Done
- The address and phone add/edit dialogs show no example values in empty fields.
- Existing saved values still populate when editing.
